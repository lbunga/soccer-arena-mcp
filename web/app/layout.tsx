"use client";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [time, setTime] = useState("20:51:02");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toTimeString().split(" ")[0]);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const links = [
    { name: "Dashboard", href: "/" },
    { name: "Policies", href: "/policies" },
  ];

  return (
    <html lang="en" className="light">
      <head>
        <title>VIRTUAL SOCCER ARENA | Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Anybody:ital,wght@0,400;0,700;0,800;0,900;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-on-surface font-body-md min-h-screen pb-12">
        {/* TopNavBar */}
        <header className="bg-surface border-b border-outline-variant fixed top-0 w-full z-50 h-20">
          <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-full max-w-container-max mx-auto">
            <div className="flex items-center gap-xs">
              <Link href="/" className="font-display-lg text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight hover:opacity-95 italic inline-block transform -skew-x-6 bg-gradient-to-r from-primary via-rose-500 to-orange-500 bg-clip-text text-transparent">
                VIRTUAL SOCCER ARENA
              </Link>
              <div className="hidden md:block w-px h-6 bg-outline-variant mx-4"></div>
              <nav className="hidden md:flex items-center gap-6">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`py-2 font-label-md text-xs uppercase tracking-widest transition-colors ${
                        isActive
                          ? "text-primary font-bold border-b-2 border-primary"
                          : "text-on-surface-variant hover:text-primary"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            <div className="flex items-center gap-4">
              <Link
                href="/policies"
                className="p-2 rounded-full hover:bg-surface-variant/10 transition-colors active:scale-95 duration-150 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-primary text-2xl" data-icon="policy">policy</span>
              </Link>
              <div className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden shadow-sm">
                <img
                  className="w-full h-full object-cover"
                  alt="Stadium Manager Profile"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCS6Esvwkv5r63gwvbg_U-v640p8OnF-Wkapzfzq1pw6pYta3Wg6qnczIEiYXk56miMCeCDJklFy1VZmQVWMKbxE47O6RYbStjBtF5YQuIh-VFit3PQ6wgx7GM4rgXecW4Y0AFub8RhB_CC3mzLG3oDDfNPxEWOGyX8M4WW5FhW-rzgEjDPnHR3t-ogecdW2WaMo1NDqOhI3MqW4eR8pJzrsgSx13CHJgRCqrKLcEDsV9q1TAzkkj1J7KgXlsvdTwfiujtTSKbizjyY"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-20 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto min-h-[calc(100vh-80px)]">
          {children}
        </main>

        {/* Footer / Status Bar */}
        <div className="fixed bottom-0 left-0 w-full bg-secondary text-on-secondary px-margin-mobile py-2 z-50 flex justify-between items-center shadow-md text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" data-icon="check_circle">check_circle</span>
            <span className="font-label-md uppercase tracking-widest text-[10px] md:text-[11px] font-semibold">
              All arena protocols operational • FIFA Grade A Certification Valid
            </span>
          </div>
          <div className="flex gap-4 font-mono text-[10px] md:text-[11px]">
            <span>EST (UTC -05:00)</span>
            <span id="real-time">{time}</span>
          </div>
        </div>
      </body>
    </html>
  );
}
