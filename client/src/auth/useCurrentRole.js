import { useMemo } from 'react';

const CURRENT_USER = {
  id: 'local-operator',
  name: 'Raffle Operator',
  email: 'operator@local',
  role: 'ADMIN'
};

export function useCurrentRole() {
  return CURRENT_USER.role;
}

export function useCurrentUser() {
  return useMemo(() => CURRENT_USER, []);
}
