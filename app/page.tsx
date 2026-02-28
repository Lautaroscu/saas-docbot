import { redirect } from 'next/navigation';

export default function Root() {
    // If we reach the root layout we automatically redirect to dashboard.
    // The middleware will catch this if the user is unauthenticated and send them to /sign-in.
    redirect('/dashboard');
}
