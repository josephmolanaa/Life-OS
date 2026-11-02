# Streams Windows Master Volume changes and GSMTC media playback to stdout as JSON lines.
# Accepts control commands on stdin (playPause, next, previous, setVolume <val>, setMute <0|1>, exit).
$ErrorActionPreference = 'SilentlyContinue'
# OEM codepage best-fits curly quotes in titles to '"', which breaks the JSON line; emit UTF-8 instead.
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$code = @"
using System;
using System.Threading;
using System.Runtime.InteropServices;

namespace DuckiesAudio {
    [Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IAudioEndpointVolume {
        int RegisterControlChangeNotify(IntPtr pNotify);
        int UnregisterControlChangeNotify(IntPtr pNotify);
        int GetChannelCount(out uint pnChannelCount);
        int SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
        int SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
        int GetMasterVolumeLevel(out float pfLevelDB);
        int GetMasterVolumeLevelScalar(out float pfLevel);
        int SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
        int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
        int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
        int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
        int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
        int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice {
        int Activate(ref Guid id, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object interfacePointer);
    }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator {
        int EnumAudioEndpoints(int dataFlow, int dwStateMask, out object ppDevices);
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppEndpoint);
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    public class MMDeviceEnumeratorComObject {}

    public class AudioPoll {
        private static IAudioEndpointVolume _vol;
        static AudioPoll() {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev;
                enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
                var iid = new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
                object epv;
                dev.Activate(ref iid, 1, IntPtr.Zero, out epv);
                _vol = (IAudioEndpointVolume)epv;
            } catch {}
        }

        public static int GetState(out float volume, out bool muted) {
            volume = 0;
            muted = false;
            if (_vol == null) return -1;
            try {
                _vol.GetMasterVolumeLevelScalar(out volume);
                _vol.GetMute(out muted);
                return 0;
            } catch { return -1; }
        }

        public static void SetVolume(float level) {
            if (_vol == null) return;
            try {
                Guid ctx = Guid.Empty;
                _vol.SetMasterVolumeLevelScalar(level, ref ctx);
            } catch {}
        }

        public static void SetMute(bool muted) {
            if (_vol == null) return;
            try {
                Guid ctx = Guid.Empty;
                _vol.SetMute(muted, ref ctx);
            } catch {}
        }
    }

    public class StdinReader {
        private static string _cmd = null;
        private static readonly object _lock = new object();
        public static void Start() {
            var t = new Thread(() => {
                while (true) {
                    try {
                        string line = Console.ReadLine();
                        if (line == null) break;
                        lock (_lock) { _cmd = line.Trim(); }
                    } catch { break; }
                }
            });
            t.IsBackground = true;
            t.Start();
        }
        public static string PopCommand() {
            lock (_lock) {
                var c = _cmd;
                _cmd = null;
                return c;
            }
        }
    }
}
"@
Add-Type -TypeDefinition $code
[DuckiesAudio.StdinReader]::Start()

Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$null = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -match "IAsyncOperation" } | Select-Object -First 1
function Await($op, [Type]$t) {
    if (-not $op) { return $null }
    try {
        $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op))
        $task.Wait(1200) | Out-Null
        return $task.Result
    } catch { return $null }
}
$asStreamForRead = [System.IO.WindowsRuntimeStreamExtensions].GetMethods() | Where-Object { $_.Name -eq "AsStreamForRead" } | Select-Object -First 1

$mgr = $null
try {
    $mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
} catch {}

$lastVol = -1.0
$lastMute = $null
$lastMediaKey = ""
$lastStatus = ""
$lastSentPos = -1.0
$lastSentTime = [DateTime]::MinValue
$cachedThumbnail = ""
$cachedThumbKey = ""
$tick = 0
$mgrAge = 0
$shownSession = $null

[Console]::Out.WriteLine((@{ type = 'ready' } | ConvertTo-Json -Compress))

while ($true) {
    # 1. Stdin commands
    $cmd = [DuckiesAudio.StdinReader]::PopCommand()
    if ($cmd) {
        if ($cmd -eq 'exit') { break }
        # Control the session the island is showing, not whatever Windows calls "current".
        $s = if ($shownSession) { $shownSession } elseif ($mgr) { $mgr.GetCurrentSession() } else { $null }
        if ($cmd -eq 'playPause') {
            if ($s) { $s.TryTogglePlayPauseAsync() | Out-Null }
        } elseif ($cmd -eq 'next') {
            if ($s) { $s.TrySkipNextAsync() | Out-Null }
        } elseif ($cmd -eq 'previous') {
            if ($s) { $s.TrySkipPreviousAsync() | Out-Null }
        } elseif ($cmd.StartsWith('setVolume ')) {
            $val = [float]($cmd.Substring(10))
            [DuckiesAudio.AudioPoll]::SetVolume($val)
        } elseif ($cmd.StartsWith('setMute ')) {
            $m = ($cmd.Substring(8) -eq '1' -or $cmd.Substring(8) -eq 'true')
            [DuckiesAudio.AudioPoll]::SetMute($m)
        }
    }

    # 2. Volume check (every 100ms)
    $curVol = 0.0
    $curMute = $false
    if ([DuckiesAudio.AudioPoll]::GetState([ref]$curVol, [ref]$curMute) -eq 0) {
        $rounded = [Math]::Round($curVol * 100)
        if ($rounded -ne $lastVol -or $curMute -ne $lastMute) {
            $isInitial = ($lastVol -lt 0)
            $lastVol = $rounded
            $lastMute = $curMute
            [Console]::Out.WriteLine((@{
                type = 'volume'
                level = [int]$rounded
                muted = [bool]$curMute
                initial = [bool]$isInitial
            } | ConvertTo-Json -Compress))
        }
    }

    # 3. Media check (every 300ms)
    $tick++
    if ($tick -ge 3) {
        $tick = 0
        # STA thread has no message pump, so a long-lived manager never sees session add/remove/update events and
        # keeps reporting a stale track. Re-request it every ~1.5s to get a fresh snapshot.
        $mgrAge++
        if (-not $mgr -or $mgrAge -ge 5) {
            $mgrAge = 0
            $fresh = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
            if ($fresh) { $mgr = $fresh }
        }
        if ($mgr) {
            try {
                $session = $null
                $sessions = $mgr.GetSessions()
                if ($sessions -and $sessions.Count -gt 0) {
                    foreach ($s in $sessions) {
                        try {
                            if ("$($s.GetPlaybackInfo().PlaybackStatus)" -eq 'Playing') {
                                $session = $s
                                break
                            }
                        } catch {}
                    }
                    if (-not $session) {
                        foreach ($s in $sessions) {
                            try {
                                $app = "$($s.SourceAppUserModelId)".ToLowerInvariant()
                                if ($app -match 'spotify|music|tidal|deezer|apple') {
                                    $session = $s
                                    break
                                }
                            } catch {}
                        }
                    }
                    if (-not $session) {
                        foreach ($s in $sessions) {
                            try {
                                $app = "$($s.SourceAppUserModelId)".ToLowerInvariant()
                                $prop = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                                if ($prop -and $prop.Artist -and ($app -notmatch 'chrome|msedge|firefox|opera|brave')) {
                                    $session = $s
                                    break
                                }
                            } catch {}
                        }
                    }
                }
                if (-not $session) {
                    $session = $mgr.GetCurrentSession()
                }
                $shownSession = $session
                if ($session) {
                    $playback = $session.GetPlaybackInfo()
                    $status = "$($playback.PlaybackStatus)"
                    $timeline = $session.GetTimelineProperties()
                    $pos = 0.0
                    $dur = 0.0
                    if ($timeline) {
                        $rawPos = $timeline.Position.TotalSeconds
                        # Spotify refreshes Position only every few seconds; extrapolate from LastUpdatedTime while playing.
                        if ($status -eq 'Playing' -and $timeline.LastUpdatedTime.Year -gt 2000) {
                            $age = ([DateTimeOffset]::UtcNow - $timeline.LastUpdatedTime).TotalSeconds
                            if ($age -gt 0 -and $age -lt 30) { $rawPos += $age }
                        }
                        $dur = [Math]::Round($timeline.EndTime.TotalSeconds, 1)
                        if ($dur -gt 0) { $rawPos = [Math]::Min($rawPos, $dur) }
                        $pos = [Math]::Round($rawPos, 2)
                    }
                    $info = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
                    $title = if ($info) { "$($info.Title)" } else { "" }
                    $artist = if ($info) { "$($info.Artist)" } else { "" }
                    $album = if ($info) { "$($info.AlbumTitle)" } else { "" }
                    $appId = "$($session.SourceAppUserModelId)"
                    $mediaKey = "$appId|$title|$artist"

                    if ($mediaKey -ne $cachedThumbKey -or (-not $cachedThumbnail -and $info -and $info.Thumbnail)) {
                        $cachedThumbKey = $mediaKey
                        if ($info -and $info.Thumbnail -and $asStreamForRead) {
                            try {
                                $ras = Await ($info.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
                                if ($ras) {
                                    $stream = $asStreamForRead.Invoke($null, @($ras))
                                    $ms = New-Object System.IO.MemoryStream
                                    $stream.CopyTo($ms)
                                    $bytes = $ms.ToArray()
                                    if ($bytes.Length -gt 0 -and $bytes.Length -le 2097152) {
                                        # Spotify sends a monochrome Spotify logo instead of cover art; drop it so the UI uses iTunes art or a placeholder.
                                        $isLogo = $false
                                        try {
                                            $imgStream = New-Object System.IO.MemoryStream(,$bytes)
                                            $srcBmp = New-Object System.Drawing.Bitmap ([System.Drawing.Image]::FromStream($imgStream))
                                            $isLogo = $true
                                            for ($sy = 0; $sy -lt $srcBmp.Height -and $isLogo; $sy += 7) {
                                                for ($sx = 0; $sx -lt $srcBmp.Width; $sx += 7) {
                                                    $px = $srcBmp.GetPixel($sx, $sy)
                                                    if ([Math]::Abs($px.R - $px.G) -gt 12 -or [Math]::Abs($px.G - $px.B) -gt 12) { $isLogo = $false; break }
                                                }
                                            }
                                            $srcBmp.Dispose()
                                            $imgStream.Dispose()
                                        } catch { $isLogo = $false }
                                        $cachedThumbnail = if ($isLogo) { '' } else { "data:image/jpeg;base64," + [Convert]::ToBase64String($bytes) }
                                    }
                                }
                            } catch {}
                        }
                    }

                    $now = [DateTime]::UtcNow
                    $elapsedSinceSent = ($now - $lastSentTime).TotalSeconds
                    $shouldSend = ($status -ne $lastStatus) -or ($mediaKey -ne $lastMediaKey) -or ($elapsedSinceSent -ge 1.0)

                    if ($shouldSend) {
                        $lastStatus = $status
                        $lastMediaKey = $mediaKey
                        $lastSentPos = $pos
                        $lastSentTime = $now

                        [Console]::Out.WriteLine((@{
                            type = 'media'
                            status = $status
                            title = $title
                            artist = $artist
                            album = $album
                            position = $pos
                            duration = $dur
                            thumbnail = $cachedThumbnail
                            sourceAppId = $appId
                        } | ConvertTo-Json -Compress))
                    }
                } else {
                    if ($lastStatus -ne 'Stopped') {
                        $lastStatus = 'Stopped'
                        $lastMediaKey = ''
                        $lastSentTime = [DateTime]::UtcNow
                        [Console]::Out.WriteLine((@{
                            type = 'media'
                            status = 'Stopped'
                        } | ConvertTo-Json -Compress))
                    }
                }
            } catch {}
        }
    }

    Start-Sleep -Milliseconds 100
}
