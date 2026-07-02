import { redirect } from "next/navigation";

// O middleware trata do routing (login vs dashboard vs setup)
export default function Home() {
  redirect("/dashboard");
}
