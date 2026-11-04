import type {Metadata} from 'next';
import {getChatGPTUser, chatGPTSignInPath} from '@/app/chatgpt-auth';
import AdminPanel from '@/components/admin-panel';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Store management', robots: {index: false, follow: false}};

export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (!user) return <section className="admin-login">
    <p className="eyebrow">WESTOS / STORE MANAGEMENT</p>
    <h1>Your store.<br /><em>In your hands.</em></h1>
    <p>Manage products, count your stock and update store settings from one place.</p>
    <a className="button" href={chatGPTSignInPath('/admin/')} target="_top">Sign in with ChatGPT <span aria-hidden="true">↗</span></a>
    <p className="admin-help">Apne owner account se login karein. Koi alag default username ya password nahi hai.</p>
  </section>;
  return <AdminPanel />;
}
