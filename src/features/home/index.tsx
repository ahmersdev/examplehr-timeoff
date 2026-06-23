'use client';

import { useRouter } from 'next/navigation';

import { DEMO_EMPLOYEE, DEMO_MANAGER } from '@/lib/demo-users';
import { useAppStore } from '@/store/useAppStore';

const Home = () => {
  const router = useRouter();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);

  function selectEmployee() {
    setCurrentUser(DEMO_EMPLOYEE);
    router.push('/employee');
  }

  function selectManager() {
    setCurrentUser(DEMO_MANAGER);
    router.push('/manager');
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          HR Time Off Demo
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Choose a role to explore the app
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={selectEmployee}
          className="rounded-lg bg-zinc-900 px-8 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          I am an Employee
        </button>
        <button
          type="button"
          onClick={selectManager}
          className="rounded-lg border border-zinc-300 bg-white px-8 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          I am a Manager
        </button>
      </div>
    </main>
  );
};

export default Home;
