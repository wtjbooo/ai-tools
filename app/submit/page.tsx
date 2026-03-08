import type { Metadata } from "next";
import SubmitForm from "./SubmitForm";

export const metadata: Metadata = {
  title: "提交 AI 工具",
  description: "提交你的 AI 工具，等待审核收录到 AI 工具目录。",
  alternates: {
    canonical: "https://y78bq.dpdns.org/submit",
  },
  openGraph: {
    title: "提交 AI 工具",
    description: "提交你的 AI 工具，等待审核收录到 AI 工具目录。",
    url: "https://y78bq.dpdns.org/submit",
    siteName: "AI 工具目录",
    type: "website",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function SubmitPage() {
  return <SubmitForm />;
}