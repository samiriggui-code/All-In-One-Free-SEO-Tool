
export function patternToRegex(pattern: string) {
  if (pattern === "*") {
    return /^.*$/;
  }
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regexStr = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${regexStr}$`);
}
export function matchesPattern(ruleId: string, pattern: string) {
  const regex = patternToRegex(pattern);
  return regex.test(ruleId);
}
export function matchesAnyPattern(ruleId: string, patterns: string[]) {
  return patterns.some((pattern) => matchesPattern(ruleId, pattern));
}
export function isRuleEnabled(ruleId: string, enable: string[], disable: string[]) {
  if (disable.length > 0 && matchesAnyPattern(ruleId, disable)) {
    return false;
  }
  if (enable.length === 0) {
    return true;
  }
  return matchesAnyPattern(ruleId, enable);
}
