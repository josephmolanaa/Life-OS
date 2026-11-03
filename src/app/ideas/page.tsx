import { Shell } from '@/components/finance/layout';
import { IdeaGallery } from '@/components/ideas/idea-gallery';

export const metadata = {
  title: 'Bunch Of Ideas | Life OS',
  description: 'Peta eksplorasi ide terisolasi dengan prinsip inversi dan validasi berjenjang.',
};

export default function IdeasPage() {
  return (
    <Shell title="Bunch Of Ideas" quickFab={false}>
      <IdeaGallery />
    </Shell>
  );
}
