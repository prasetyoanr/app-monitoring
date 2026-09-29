// GA keeps ownership of intake while execution follows the assigned unit.
// Old non-GA requests retain their original destination restriction.
export function canAssignRequestToUnit(
  receivingDivisionId: string | null | undefined,
  serviceDivisionId: string,
  unit: { id: string; isGaUnit: boolean },
) {
  return receivingDivisionId ? unit.isGaUnit : unit.id === serviceDivisionId;
}
