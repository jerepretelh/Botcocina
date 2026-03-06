import { printCatalogValidation, validateCatalogData } from './catalogValidation';

const result = validateCatalogData();
printCatalogValidation(result);

if (!result.ok) {
  process.exitCode = 1;
}

