export function dezSombrasQaEnvironmentAllowed(
  isDevelopment: boolean,
  qaFlag: string | undefined,
): boolean {
  return isDevelopment && qaFlag === '1';
}

export function dezSombrasQaOriginAllowed(hostname: string, port: string): boolean {
  return hostname === '127.0.0.1' && port === '5181';
}