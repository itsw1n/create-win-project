// Laravel auth modules add their model-specific names while catalog resolution
// builds the final ordered environment list.
export function environmentContributions({ stack } = {}) {
  return stack?.env ? [...stack.env] : []
}
