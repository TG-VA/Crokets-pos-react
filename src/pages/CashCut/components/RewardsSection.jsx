import { SectionCard, DataRow } from "./primitives";

import GiftsIcon from "../../../assets/icons/gifts-solid-full.svg";

const RewardsSection = ({ rewardSummary }) => (
  <SectionCard icon={GiftsIcon} title="RECOMPENSAS">
    {rewardSummary.canjesAplicados > 0 && (
      <>
        <DataRow
          label="Canjes aplicados"
          value={rewardSummary.canjesAplicados}
          color="#2e7d32"
        />
        <DataRow
          label="Puntos usados"
          value={`- ${rewardSummary.puntosUsados} pts`}
          color="#c62828"
        />
      </>
    )}

    {rewardSummary.canjesRevertidos > 0 && (
      <>
        <DataRow
          label="Canjes revertidos"
          value={rewardSummary.canjesRevertidos}
          color="#00695c"
          borderTop={rewardSummary.canjesAplicados > 0}
        />
        <DataRow
          label="Puntos devueltos"
          value={`+ ${rewardSummary.puntosDevueltos} pts`}
          color="#00695c"
        />
      </>
    )}
  </SectionCard>
);

export default RewardsSection;
