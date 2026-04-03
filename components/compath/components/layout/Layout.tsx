"use client"
import type { ReactNode } from "react";
import type { PageType } from "../../App";
import Header from "./Header";
import FloatingActionButton from "./FloatingActionButton";

type LayoutProps = {
  children: ReactNode;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
};

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div className="layout">
      <Header currentPage={currentPage} onNavigate={onNavigate} />
      <main className="layout__main">
        {children}
      </main>
      <FloatingActionButton />
    </div>
  );
}
