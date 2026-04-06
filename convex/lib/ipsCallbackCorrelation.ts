import { mapToTransactionStatus } from './ipsErrorCodes';
import type { ParsedRespChkTxnDetails } from './ipsResponseParsers';

export interface RespChkTxnResolutionInput {
  details: ParsedRespChkTxnDetails;
  transactionIdFromPayload?: string;
  transactionIdFromOutboundLog?: string;
  originalMsgIdFromOutboundLog?: string;
  respCode?: string;
  respDescription?: string;
}

export interface RespChkTxnResolution {
  transactionId?: string;
  originalMsgId?: string;
  originalTxnId?: string;
  resolvedRespCode?: string;
  resolvedRespDescription?: string;
  status: 'completed' | 'failed' | 'processing' | 'reversed' | 'timeout';
}

export function resolveRespChkTxnResolution(
  input: RespChkTxnResolutionInput
): RespChkTxnResolution {
  const originalMsgId = input.details.orgMsgId ?? input.originalMsgIdFromOutboundLog;
  const resolvedRespCode =
    input.details.primaryRespCode ?? input.details.errorCode ?? input.respCode;
  const resolvedRespDescription = input.details.errorDescription ?? input.respDescription;
  const transactionId = input.transactionIdFromPayload ?? input.transactionIdFromOutboundLog;

  let status: RespChkTxnResolution['status'];
  if (input.details.result === 'PENDING') {
    status = 'processing';
  } else if (input.details.result === 'DEEMED') {
    status = 'timeout';
  } else {
    status = mapToTransactionStatus(resolvedRespCode ?? 'UNKNOWN');
  }

  return {
    transactionId,
    originalMsgId,
    originalTxnId: input.details.orgTxnId,
    resolvedRespCode,
    resolvedRespDescription,
    status,
  };
}
