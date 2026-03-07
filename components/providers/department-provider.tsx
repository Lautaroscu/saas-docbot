'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface Department {
    id: number;
    name: string;
}

interface DepartmentContextType {
    currentDepartmentId: number | null;
    currentDepartment: Department | null;
    setCurrentDepartmentId: (id: number | null) => void;
    availableDepartments: Department[];
    setAvailableDepartments: (depts: Department[]) => void;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
    const [currentDepartmentId, setDepartmentIdState] = useState<number | null>(null);
    const [availableDepartments, setAvailableDepsState] = useState<Department[]>([]);

    useEffect(() => {
        // Initialize from cookie on mount
        const savedId = Cookies.get('medly_department_id');
        if (savedId && savedId !== 'all') {
            setDepartmentIdState(parseInt(savedId, 10));
        }
    }, []);

    const setCurrentDepartmentId = (id: number | null) => {
        setDepartmentIdState(id);
        if (id) {
            Cookies.set('medly_department_id', id.toString(), { path: '/' });
            localStorage.setItem('medly_department_id', id.toString());
        } else {
            Cookies.remove('medly_department_id', { path: '/' });
            localStorage.removeItem('medly_department_id');
        }
    };

    const setAvailableDepartments = (depts: Department[]) => {
        setAvailableDepsState(depts);
        // Validacion de seguridad (por si cambia de equipo o le revocan permisos a ese department)
        if (currentDepartmentId && !depts.find(d => d.id === currentDepartmentId)) {
            setCurrentDepartmentId(depts.length > 0 ? depts[0].id : null);
        }
    };

    const currentDepartment = currentDepartmentId
        ? availableDepartments.find(d => d.id === currentDepartmentId) || null
        : null;

    return (
        <DepartmentContext.Provider value={{
            currentDepartmentId,
            currentDepartment,
            setCurrentDepartmentId,
            availableDepartments,
            setAvailableDepartments
        }}>
            {children}
        </DepartmentContext.Provider>
    );
}

export function useCurrentDepartment() {
    const context = useContext(DepartmentContext);
    if (!context) {
        throw new Error('useCurrentDepartment must be used within a DepartmentProvider');
    }
    return context;
}
