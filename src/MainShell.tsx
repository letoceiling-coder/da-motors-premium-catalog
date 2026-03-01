import { Outlet } from "react-router-dom";
import { AIAssistant } from "@/components/AIAssistant";
import { BottomNav } from "@/components/BottomNav";

export function MainShell() {
  return (
    <>
      <Outlet />
      <AIAssistant />
      <BottomNav />
    </>
  );
}
