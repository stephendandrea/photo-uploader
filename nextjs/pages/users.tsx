import prisma from '@/lib/primsa';
import '@/app/globals.css';
import { User } from '@prisma/client';

export async function getStaticProps() {
  const users = await prisma.user.findMany();

  return {
    props: { users },
  };
}
export default function Home({ users }: {users: User[] }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <ul>
        {users.map((user) => (
          <li key={user.email}>
            {user.name} : {user.email}
          </li>
        ))}
      </ul>
    </main>
  );
}
