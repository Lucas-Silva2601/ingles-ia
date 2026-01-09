import { NavBar } from './NavBar';
import { SideNav } from './SideNav';
export function Layout({ children }) {
    return (<div className="grid grid-cols-[240px_minmax(0,1fr)] gap-6 max-[900px]:grid-cols-[minmax(0,1fr)]">
      <SideNav />
      <div className="flex flex-col gap-6">
        <NavBar />
        <main className="mt-1">{children}</main>
      </div>
    </div>);
}
