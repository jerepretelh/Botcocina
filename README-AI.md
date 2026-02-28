# AI Agent Guide: Thermomix Recipe Prototype

This guide is designed to help AI agents understand and contribute to this project efficiently, minimizing token consumption and contextual confusion.

## Project Architecture

The project follows a modular React architecture with a focus on logic separation through custom hooks.

### Core Entry Point
- `src/app/components/ThermomixCooker.tsx`: Orchestrates the main UI screens and coordinates specialized hooks.

### State Management & Logic (Hooks)
To understand or modify the application logic, look into these hooks instead of the main component:
- `useRecipeSelection.ts`: Manages the available recipes and user selection.
- `usePortions.ts`: Logic for scaling ingredients and timing based on portions.
- `useCookingProgress.ts`: Tracks the current step, sub-step, and timer state.
- `useAIRecipeGeneration.ts`: Handles communication with AI for custom recipe creation.
- `useThermomixVoice.ts`: [NEW] Manages TTS (Text-to-Speech) lifecycle.
- `useThermomixTimer.ts`: [NEW] Encapsulates the countdown timer logic and beep sounds.
- `useThermomixHandlers.ts`: [NEW] Global event handlers and screen nav logic.

### Data Structures
- `src/types/index.ts`: Central source of truth for all project interfaces (Recipe, Step, SubStep, etc.).
- `src/app/data/recipes.ts`: Static recipe data and initial content.

### UI Components
Screens are isolated in `src/app/components/screens/`:
- `CookingScreen.tsx`
- `IngredientsScreen.tsx`
- `RecipeSetupScreen.tsx`
- ...etc.

## Workflow for Adding Recipes
1. Define the recipe structure in `src/app/data/recipes.ts`.
2. Follow the `Recipe` and `RecipeContent` types.
3. Ensure the `portions` object in each sub-step covers levels 1, 2, 4, 6, and 8 where applicable.

## AI Optimization Tips
- **Small Files**: Keep logic in hooks and UI in components. Avoid files larger than 500 lines.
- **Explicit Types**: Always use the types defined in `src/types/`.
- **Naming Convention**: Use `useThermomix[Area]` for feature-specific hooks.
