export type IPPSupportStatus = 'live' | 'partial' | 'legacy';

export interface IPPSupportedFlow {
  api: string;
  label: string;
  status: IPPSupportStatus;
}

export const LIVE_IPP_IMPLEMENTATION = 'Convex' as const;

export const SUPPORTED_IPP_FLOWS: readonly IPPSupportedFlow[] = [
  { api: 'ReqPay / RespPay', label: 'Payment initiation and callback settlement', status: 'live' },
  { api: 'ReqValAdd / RespValAdd', label: 'Payee alias validation', status: 'live' },
  { api: 'ReqChkTxn / RespChkTxn', label: 'Transaction status/deemed resolution', status: 'live' },
  { api: 'ReqRegMob', label: 'Device/mobile registration', status: 'live' },
  { api: 'ReqListAccPvd / RespListAccPvd', label: 'SoV provider discovery', status: 'live' },
  { api: 'ReqListAccount / RespListAccount', label: 'Linked account discovery', status: 'live' },
  { api: 'ReqOtp', label: 'OTP submission for onboarding verification', status: 'live' },
  { api: 'ReqSetCre', label: 'IPS PIN setup/change', status: 'live' },
  { api: 'ReqGetAdd / RespGetAdd', label: 'Alias directory lookup', status: 'live' },
  { api: 'ReqRegMapper / RespRegMapper', label: 'Alias registration lifecycle', status: 'live' },
] as const;

export const QUARANTINED_IPP_SURFACES = [
  'supabase/functions/ips-adapter',
  'supabase/migrations',
  'SQL/RPC-era IPP integration notes under supabase/migrations',
] as const;
