/**
 * Squad ownership for test features.
 *
 * Adding a feature:
 *   1. Add (or reuse) a squad in SQUADS.
 *   2. Add the feature name -> squad-id entry in FEATURE_OWNERSHIP.
 *   3. Pass that feature name to tagSuite() in the spec, or use the
 *      matching @feature:<Name> Gherkin tag — both routes derive
 *      ownership from this single table.
 */

export type SquadId = 'identity' | 'money' | 'lending' | 'platform';

export type Squad = {
  id: SquadId;
  name: string;
  email: string;
};

export const SQUADS: Record<SquadId, Squad> = {
  identity: { id: 'identity', name: 'Identity Squad', email: 'identity@retailflow.example' },
  money:    { id: 'money',    name: 'Money Movement', email: 'money@retailflow.example' },
  lending:  { id: 'lending',  name: 'Lending Squad',  email: 'lending@retailflow.example' },
  platform: { id: 'platform', name: 'Platform Squad', email: 'platform@retailflow.example' },
};

export const FEATURE_OWNERSHIP: Record<string, SquadId> = {
  Authentication: 'identity',
  Accounts:       'money',
  Transfers:      'money',
  Payments:       'money',
  Settings:       'platform',
  Loans:          'lending',
};

export function squadForFeature(feature: string | undefined): Squad | undefined {
  if (!feature) return undefined;
  const id = FEATURE_OWNERSHIP[feature];
  return id ? SQUADS[id] : undefined;
}
