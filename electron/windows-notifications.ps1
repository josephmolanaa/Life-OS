# Streams new Windows toast notifications (from any app) as JSON lines on stdout.
# Uses the built-in WinRT UserNotificationListener; requires Windows "Notification access" for desktop apps.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  $task.Wait(-1) | Out-Null
  $task.Result
}
$listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
$status = Await ($listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])
if ($status -ne 'Allowed') { [Console]::Out.WriteLine((@{ type = 'status'; status = "$status" } | ConvertTo-Json -Compress)); exit 2 }
$listType = [System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]]
$seen = @{}
# Everything already in Action Center is history, not news.
foreach ($n in (Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $listType)) { $seen[$n.Id] = $true }
[Console]::Out.WriteLine((@{ type = 'status'; status = 'Allowed' } | ConvertTo-Json -Compress))
while ($true) {
  Start-Sleep -Milliseconds 700
  foreach ($n in (Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) $listType)) {
    if ($seen.ContainsKey($n.Id)) { continue }
    $seen[$n.Id] = $true
    $app = ''
    try { $app = $n.AppInfo.DisplayInfo.DisplayName } catch {}
    $texts = @()
    try { $texts = @($n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric).GetTextElements() | ForEach-Object { $_.Text }) } catch {}
    [Console]::Out.WriteLine((@{ type = 'toast'; app = "$app"; title = "$($texts | Select-Object -First 1)"; body = (($texts | Select-Object -Skip 1) -join ' ') } | ConvertTo-Json -Compress))
  }
}
