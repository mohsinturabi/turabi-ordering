'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getStaffForUser } from './dashboard-queries';
import type { Staff } from './types';

interface DashboardAuthValue {
  session: Session | null;
  staff: Staff | null;
  loading: boolean;
  // Set when login succeeded but no staff row matches this user —
  // distinct from "not logged in" so the login page can show a clear
  // message instead of just bouncing back silently.
  unauthorized: boolean;
  signOut: () => Promise<void>;
}

const DashboardAuthContext = createContext<DashboardAuthValue | null>(null);

export function DashboardAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveStaff(nextSession: Session | null) {
      setSession(nextSession);
      setUnauthorized(false);

      if (!nextSession) {
        setStaff(null);
        setLoading(false);
        return;
      }

      const staffRecord = await getStaffForUser(nextSession.user.id);
      if (cancelled) return;

      if (!staffRecord) {
        setStaff(null);
        setUnauthorized(true);
      } else {
        setStaff(staffRecord);
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => resolveStaff(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      resolveStaff(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setStaff(null);
    setSession(null);
  }

  return (
    <DashboardAuthContext.Provider value={{ session, staff, loading, unauthorized, signOut }}>
      {children}
    </DashboardAuthContext.Provider>
  );
}

export function useDashboardAuth(): DashboardAuthValue {
  const ctx = useContext(DashboardAuthContext);
  if (!ctx) throw new Error('useDashboardAuth must be used within DashboardAuthProvider');
  return ctx;
}
