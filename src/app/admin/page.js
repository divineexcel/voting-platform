"use client";
import { Portal } from "@/components/ui";
import Admin from "@/components/admin";
export default function AdminPortal() {
  return <Portal admin>{(user) => <Admin user={user} />}</Portal>;
}
