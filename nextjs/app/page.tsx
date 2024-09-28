import Image from 'next/image';
import { Uploader } from './components/uploader';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      Pork chops and apple sauce
      <Uploader />
    </main>
  );
}
