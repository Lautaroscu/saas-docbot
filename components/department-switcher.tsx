'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { useCurrentDepartment } from './providers/department-provider';

interface Department {
    id: number;
    name: string;
}

interface DepartmentSwitcherProps {
    role: "SUPER_ADMIN" | "ADMIN" | "DOCTOR";
    assignedDepartments: Department[];
}

export function DepartmentSwitcher({ role, assignedDepartments }: DepartmentSwitcherProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { currentDepartmentId, setCurrentDepartmentId } = useCurrentDepartment();

    // Condition: Render if SUPER_ADMIN, or has more than 1 assigned department
    const shouldRender = role === 'SUPER_ADMIN' || assignedDepartments.length > 1;

    if (!shouldRender || assignedDepartments.length === 0) {
        return null;
    }

    const value = currentDepartmentId ? currentDepartmentId.toString() : 'all';

    const handleSwitch = (newDeptIdStr: string) => {
        startTransition(() => {
            if (newDeptIdStr === 'all') {
                setCurrentDepartmentId(null);
            } else {
                setCurrentDepartmentId(parseInt(newDeptIdStr, 10));
            }

            // Refreshes the page data to cascade the context changes into server actions/swr
            router.refresh();
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground mr-1" />
            <Select value={value} onValueChange={handleSwitch} disabled={isPending}>
                <SelectTrigger className="w-[180px] h-8 text-xs font-medium">
                    <SelectValue placeholder="Seleccionar Área" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start">
                    {/* Only SUPER_ADMIN sees the 'All Departments' view globally if they wish,
                        or we force them to pick one. Let's provide 'All' globally */}
                    {role === 'SUPER_ADMIN' && (
                        <SelectItem value="all">Todas las Áreas</SelectItem>
                    )}

                    {assignedDepartments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                            {dept.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
