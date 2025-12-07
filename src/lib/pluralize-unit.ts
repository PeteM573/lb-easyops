import pluralize from 'pluralize';

/**
 * Formats a quantity with correctly pluralized unit
 * @param quantity - The numeric quantity
 * @param unit - The unit in singular form (e.g., "lid", "box", "cup")
 * @returns Formatted string like "1 lid" or "5 lids"
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
    if (!unit) return String(quantity);
    const displayUnit = pluralize(unit, quantity);
    return `${quantity} ${displayUnit}`;
}

/**
 * Singularizes a unit name (useful for migration/cleanup)
 * @param unit - The unit name (possibly plural)
 * @returns Singular form of the unit
 */
export function singularizeUnit(unit: string): string {
    return pluralize.singular(unit);
}
