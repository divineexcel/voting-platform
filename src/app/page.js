"use client";
import { Portal } from "@/components/ui";
import Student from "@/components/student";
export default function Home() {
  return <Portal>{(user) => <Student user={user} />}</Portal>;
}
