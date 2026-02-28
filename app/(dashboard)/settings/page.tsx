'use client';

import { redirect } from 'next/navigation';
import { Settings, Plus, Users, UserPlus, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { customerPortalAction } from '@/lib/payments/actions';
import { useActionState, Suspense } from 'react';
import { removeTeamMember, inviteTeamMember } from '@/app/(login)/actions';
import useSWR from 'swr';
import { users, teams, teamMembers } from '@/lib/db/schema';

type User = typeof users.$inferSelect;
type Team = typeof teams.$inferSelect;
type TeamDataWithMembers = Team & {
  teamMembers: (typeof teamMembers.$inferSelect & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SettingsPage() {
  const { data: user, error: userError } = useSWR<User>('/api/user', fetcher);
  const { data: teamData, error: teamError } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  if (userError || teamError) {
    return <div className="p-4 text-red-500">Error loading data.</div>;
  }

  if (!user || !teamData) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium text-gray-900 mb-6">
        Team Settings
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Subscription</CardTitle>
          <CardDescription>
            Manage your team's subscription and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="mb-4 sm:mb-0">
                <p className="font-medium">
                  Current Plan: {teamData.planName || 'Free'}
                </p>
                <p className="text-sm text-gray-500">
                  {teamData.subscriptionStatus === 'active'
                    ? 'Billed monthly'
                    : teamData.subscriptionStatus === 'trialing'
                      ? 'Trial period'
                      : 'No active subscription'}
                </p>
              </div>
              <form action={customerPortalAction}>
                <Button type="submit" variant="outline">
                  Manage Subscription
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {(teamData.teamMembers || []).map((member, index) => (
              <li key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>
                      {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.user.name || member.user.email}</p>
                    <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                  </div>
                </div>
                {member.role !== 'owner' && (
                  <form action={async (formData) => {
                    formData.append('memberId', member.id.toString());
                    await removeTeamMember({ error: '', success: '' }, formData);
                  }}>
                    <Button variant="ghost" size="sm" type="submit">
                      Remove
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
