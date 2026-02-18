-- Fix XML injection vulnerability in pacs.009 generation
-- Migration: 20260218100000_fix_pacs009_xml_injection.sql
-- Addresses: XML entity escaping for participant names and BICs

-- ============================================================================
-- XML ESCAPE HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION xml_escape(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(input, '&', '&amp;'),
          '<', '&lt;'),
        '>', '&gt;'),
      '"', '&quot;'),
    '''', '&apos;')
$$;

COMMENT ON FUNCTION xml_escape IS 'Escape XML special characters to prevent injection in generated ISO 20022 documents';

-- ============================================================================
-- PATCHED pacs.009 XML GENERATOR
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_pacs009_xml(
  p_run_id UUID,
  p_batch_type settlement_batch_type,
  p_msg_id VARCHAR
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_run RECORD;
  v_xml TEXT;
  v_txn_xml TEXT := '';
  v_instr RECORD;
  v_instr_count INTEGER := 0;
  v_total_amount DECIMAL := 0;
BEGIN
  SELECT * INTO v_run FROM settlement_runs WHERE id = p_run_id;

  -- Build transaction entries (with XML-escaped values)
  FOR v_instr IN
    SELECT
      ni.*,
      sp.swift_bic as source_bic,
      sp.name as source_name,
      tp.swift_bic as target_bic,
      tp.name as target_name
    FROM settlement_net_instructions ni
    JOIN settlement_participants sp ON ni.source_participant_id = sp.id
    JOIN settlement_participants tp ON ni.target_participant_id = tp.id
    WHERE ni.run_id = p_run_id AND ni.batch_type = p_batch_type
    ORDER BY ni.instruction_id
  LOOP
    v_instr_count := v_instr_count + 1;
    v_total_amount := v_total_amount + v_instr.amount;

    v_txn_xml := v_txn_xml || '
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>' || xml_escape(v_instr.instruction_id) || '</InstrId>
        <EndToEndId>' || xml_escape(COALESCE(v_instr.end_to_end_id, v_instr.instruction_id)) || '</EndToEndId>
      </PmtId>
      <IntrBkSttlmAmt Ccy="' || xml_escape(v_run.currency) || '">' || TO_CHAR(v_instr.amount, 'FM999999999990.00') || '</IntrBkSttlmAmt>
      <ChrgBr>SHAR</ChrgBr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>' || xml_escape(v_instr.source_bic) || '</BICFI>
          <Nm>' || xml_escape(v_instr.source_name) || '</Nm>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>' || xml_escape(v_instr.target_bic) || '</BICFI>
          <Nm>' || xml_escape(v_instr.target_name) || '</Nm>
        </FinInstnId>
      </CdtrAgt>
    </CdtTrfTxInf>';
  END LOOP;

  -- Build complete XML (msg_id and run_id are system-generated, safe to use directly)
  v_xml := '<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.009.001.08">
  <FICdtTrf>
    <GrpHdr>
      <MsgId>' || xml_escape(p_msg_id) || '</MsgId>
      <CreDtTm>' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || '</CreDtTm>
      <NbOfTxs>' || v_instr_count || '</NbOfTxs>
      <CtrlSum>' || TO_CHAR(v_total_amount, 'FM999999999990.00') || '</CtrlSum>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
        <SttlmDt>' || TO_CHAR(v_run.settlement_date, 'YYYY-MM-DD') || '</SttlmDt>
      </SttlmInf>
    </GrpHdr>' || v_txn_xml || '
  </FICdtTrf>
</Document>';

  RETURN v_xml;
END;
$$;

GRANT EXECUTE ON FUNCTION xml_escape TO authenticated;
