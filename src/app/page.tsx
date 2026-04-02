import dynamic from 'next/dynamic';

const MainApp = dynamic(() => import('@/components/MainApp'), {
  ssr: false,
  loading: () => <div className="app" suppressHydrationWarning />,
});

export default function Home() {
  return <MainApp />;
}
