import { Suspense, lazy } from 'react';
import type { AIRecipeContextDraft } from '../../../../types';
import { ThermomixCompatCookingScreen } from '../compat/ThermomixCompatScreens';
import type { AppShellModel, CookingUiModel, OverlayUiModel } from '../lib/screenModels';

const AIClarifyScreen = lazy(() => import('../../screens/AIClarifyScreen').then((module) => ({ default: module.AIClarifyScreen })));
const CookingScreenV2 = lazy(() => import('../../screens/CookingScreenV2').then((module) => ({ default: module.CookingScreenV2 })));
const CompoundCookingScreen = lazy(() => import('../../screens/CompoundCookingScreen').then((module) => ({ default: module.CompoundCookingScreen })));

function ScreenFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-12">
      <div className="rounded-[1.5rem] border border-primary/10 bg-card/80 px-6 py-4 text-sm font-medium text-slate-500 shadow-sm dark:text-slate-400">
        Cargando pantalla...
      </div>
    </div>
  );
}

export function ThermomixCookingScreenHost({ appShell, cookingUi, overlayUi }: { appShell: AppShellModel; cookingUi: CookingUiModel; overlayUi: OverlayUiModel }) {
  if (cookingUi.screen === 'ai-clarify') {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <AIClarifyScreen
          contextDraft={cookingUi.ai.aiContextDraft}
          wizardStep={cookingUi.ai.aiWizardStep}
          preRecipe={cookingUi.ai.aiPreRecipe}
          previewMessages={cookingUi.ai.aiPreviewMessages}
          previewDraftMessage={cookingUi.ai.aiPreviewDraftMessage}
          selectedSeed={cookingUi.ai.selectedRecipeSeed}
          suggestedTitle={cookingUi.ai.aiClarificationSuggestedTitle}
          tip={cookingUi.ai.aiClarificationTip}
          aiError={cookingUi.ai.aiError}
          isGeneratingPreview={cookingUi.ai.isGeneratingPreview}
          onContextPromptChange={cookingUi.ai.handleAiPromptChange}
          isMockModeEnabled={cookingUi.ai.isAiMockModeEnabled}
          onContextServingsChange={(value) => cookingUi.ai.setAiContextDraft((prev: AIRecipeContextDraft) => ({ ...prev, servings: value }))}
          onAddAvailableIngredient={cookingUi.ai.addAvailableIngredient}
          onRemoveAvailableIngredient={cookingUi.ai.removeAvailableIngredient}
          onAddAvoidIngredient={cookingUi.ai.addAvoidIngredient}
          onRemoveAvoidIngredient={cookingUi.ai.removeAvoidIngredient}
          onPreviewDraftMessageChange={cookingUi.ai.setAiPreviewDraftMessage}
          onBack={cookingUi.ai.handleAiWizardBack}
          onContinue={cookingUi.ai.handleAiContextContinue}
          onUpdatePreRecipe={cookingUi.ai.handleUpdatePreRecipe}
          onGenerate={cookingUi.ai.handleGenerateRecipe}
          onLoadMockExample={() => cookingUi.ai.applyMockScenarioToContext('milanesa')}
          onSkipToMockPreview={() => cookingUi.ai.jumpToMockPreview('milanesa')}
          onGenerateMockRecipe={() => void cookingUi.ai.generateMockRecipeDirect('milanesa')}
          isGenerating={cookingUi.ai.isGeneratingRecipe}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ScreenFallback />}>
      {cookingUi.isCompoundRecipe ? (
        <CompoundCookingScreen
          selectedRecipe={cookingUi.selectedRecipe}
          presentation={cookingUi.compoundPresentation}
          currentItem={cookingUi.compoundCooking.currentItem}
          nextItem={cookingUi.compoundCooking.nextItem}
          currentTimelineIndex={cookingUi.compoundCooking.currentTimelineIndex}
          totalTimelineItems={cookingUi.compoundCooking.timeline.length}
          progressPercent={cookingUi.compoundCooking.progressPercent}
          activeTimers={cookingUi.compoundCooking.activeTimers}
          componentProgress={cookingUi.compoundCooking.componentProgress}
          currentTimer={cookingUi.compoundCooking.currentTimer}
          isCurrentTimerStarted={cookingUi.compoundCooking.isCurrentTimerStarted}
          isCurrentTimerRunning={cookingUi.compoundCooking.isCurrentTimerRunning}
          isCurrentTimerExpired={cookingUi.compoundCooking.isCurrentTimerExpired}
          isRecipeComplete={cookingUi.compoundCooking.isRecipeComplete}
          primaryActionLabel={cookingUi.compoundPrimaryAction.label}
          primaryActionKind={cookingUi.compoundPrimaryAction.kind}
          voiceEnabled={cookingUi.voiceEnabled}
          onVoiceToggle={cookingUi.voice.handleVoiceToggle}
          speechSupported={cookingUi.speechSupported}
          inlineMessage={cookingUi.compoundCooking.inlineMessage}
          onPrevious={cookingUi.compoundCooking.handlePrevious}
          onNext={cookingUi.handleCompoundPrimaryAction}
          onToggleCurrentTimer={cookingUi.compoundCooking.handleToggleCurrentTimer}
          onFocusComponent={cookingUi.compoundCooking.handleFocusComponent}
          onDismissTimer={cookingUi.compoundCooking.dismissTimer}
          onOpenIngredients={cookingUi.onOpenIngredients}
          onOpenSetup={cookingUi.onOpenSetup}
          onExitRecipe={cookingUi.exitCurrentRecipe}
          onChangeMission={cookingUi.onChangeMission}
          onPlanRecipe={overlayUi.overlayModel.openPlanCurrentRecipe}
          isBackgroundMuted={overlayUi.overlayModel.isBackgroundMuted}
        />
      ) : cookingUi.scaledStandardRecipe ? (
        <CookingScreenV2
          selectedRecipe={cookingUi.selectedRecipe}
          scaledRecipe={cookingUi.scaledStandardRecipe}
          presentation={cookingUi.standardPresentation}
          currentStep={cookingUi.standardCooking.currentStep}
          currentSubStep={cookingUi.standardCooking.currentSubStep}
          currentIndex={cookingUi.standardCooking.currentIndex}
          totalItems={cookingUi.standardCooking.session.totalItems}
          progressPercent={cookingUi.standardCooking.progressPercent}
          isRecipeFinished={cookingUi.standardCooking.isRecipeFinished}
          activeIngredients={cookingUi.activeV2Ingredients}
          isRunning={cookingUi.standardTimer.isRunning}
          hasTimer={cookingUi.standardTimer.hasTimer}
          isTimerExpired={cookingUi.standardTimer.isExpired}
          timeRemaining={cookingUi.standardTimer.timeRemaining}
          onResetTimer={cookingUi.onResetStandardTimer}
          onPrevious={cookingUi.standardCooking.goPrevious}
          onNext={cookingUi.handleStandardPrimaryAction}
          primaryActionLabel={cookingUi.standardPrimaryAction.label}
          primaryActionKind={cookingUi.standardPrimaryAction.kind}
          onTogglePause={cookingUi.standardTimer.togglePause}
          onOpenIngredients={cookingUi.onOpenIngredients}
          onOpenSetup={cookingUi.onOpenSetup}
          onExitRecipe={cookingUi.exitCurrentRecipe}
        />
      ) : (
        <ThermomixCompatCookingScreen
          appVersion={appShell.appVersion}
          voiceEnabled={cookingUi.voiceEnabled}
          onVoiceToggle={cookingUi.voice.handleVoiceToggle}
          speechSupported={cookingUi.speechSupported}
          onChangeMission={cookingUi.compatActions.handleChangeMission}
          currentRecipeData={cookingUi.cookingProgress.currentRecipeData}
          currentStepIndex={cookingUi.cookingProgress.currentStepIndex}
          currentSubStepIndex={cookingUi.cookingProgress.currentSubStepIndex}
          currentSubStep={cookingUi.cookingProgress.currentSubStep}
          isRunning={cookingUi.cookingProgress.isRunning}
          timeRemaining={cookingUi.cookingProgress.timeRemaining}
          onTogglePause={cookingUi.compatActions.handleTogglePause}
          onPrevious={cookingUi.compatActions.handlePrevious}
          onNext={cookingUi.compatActions.handleNext}
          onJumpToSubStep={cookingUi.compatActions.handleJumpToSubStep}
          onContinue={cookingUi.compatActions.handleContinue}
          onConfirmNextUnit={cookingUi.compatActions.handleConfirmNextUnit}
          onOpenIngredients={cookingUi.onOpenIngredients}
          onOpenSetup={cookingUi.onOpenSetup}
          onExitRecipe={cookingUi.compatActions.handleExitCooking}
          onPlanRecipe={overlayUi.overlayModel.openPlanCurrentRecipe}
          activeStepLoop={cookingUi.cookingProgress.activeStepLoop}
          portion={cookingUi.recipeSelection.portion}
          awaitingNextUnitConfirmation={cookingUi.cookingProgress.awaitingNextUnitConfirmation}
          flipPromptVisible={cookingUi.cookingProgress.flipPromptVisible}
          flipPromptCountdown={cookingUi.cookingProgress.flipPromptCountdown}
          stirPromptVisible={cookingUi.cookingProgress.stirPromptVisible}
          stirPromptCountdown={cookingUi.cookingProgress.stirPromptCountdown}
          effectiveReminderTitle={cookingUi.effectiveReminderTitle}
          effectiveReminderMessage={cookingUi.effectiveReminderMessage}
          isRetirarSubStep={cookingUi.isRetirarSubStep}
          retirarTitle={cookingUi.retirarTitle}
          retirarMessage={cookingUi.retirarMessage}
          currentStep={cookingUi.cookingProgress.currentStep}
          portionValue={cookingUi.portionValue}
          currentIngredients={cookingUi.recipeSelection.currentIngredients}
          activeIngredientSelection={cookingUi.recipeSelection.activeIngredientSelection}
          activeRecipeContent={cookingUi.recipeSelection.activeRecipeContent}
          selectedRecipe={cookingUi.selectedRecipe}
          peopleCount={cookingUi.recipeSelection.peopleCount}
          quantityMode={cookingUi.recipeSelection.quantityMode}
          isBackgroundMuted={overlayUi.overlayModel.isBackgroundMuted}
        />
      )}
    </Suspense>
  );
}
