import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const logo = PlaceHolderImages.find(p => p.id === 'sow-logo');

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4 md:px-8">
        {logo && (
          <Image
            src={logo.imageUrl}
            alt={logo.description}
            width={32}
            height={32}
            className="rounded-md"
            data-ai-hint={logo.imageHint}
          />
        )}
        <h1 className="font-headline text-xl font-bold text-foreground">
          Purchase Services Manager
        </h1>
      </div>
    </header>
  );
}
