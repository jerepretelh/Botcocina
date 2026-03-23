import type { AppShellModel, CookingUiModel, LibraryUiModel, OverlayUiModel, PlanningUiModel } from '../lib/screenModels';
import { ThermomixOverlayHost } from './ThermomixOverlayHost';
import { ThermomixLibraryScreenHost } from './ThermomixLibraryScreenHost';
import { ThermomixPlanningScreenHost } from './ThermomixPlanningScreenHost';
import { ThermomixCookingScreenHost } from './ThermomixCookingScreenHost';
import { resolveThermomixScreenDomain } from '../lib/screenHostRouting';

export function ThermomixCookerScreenHost(props: {
  screen: LibraryUiModel['screen'];
  appShell: AppShellModel;
  libraryUi: LibraryUiModel;
  planningUi: PlanningUiModel;
  cookingUi: CookingUiModel;
  overlayUi: OverlayUiModel;
}) {
  const domain = resolveThermomixScreenDomain(props.screen);

  return (
    <>
      {domain === 'library' ? (
        <ThermomixLibraryScreenHost appShell={props.appShell} libraryUi={props.libraryUi} />
      ) : domain === 'planning' ? (
        <ThermomixPlanningScreenHost appShell={props.appShell} planningUi={props.planningUi} />
      ) : (
        <ThermomixCookingScreenHost appShell={props.appShell} cookingUi={props.cookingUi} overlayUi={props.overlayUi} />
      )}
      <ThermomixOverlayHost overlayModel={props.overlayUi.overlayModel} />
    </>
  );
}
