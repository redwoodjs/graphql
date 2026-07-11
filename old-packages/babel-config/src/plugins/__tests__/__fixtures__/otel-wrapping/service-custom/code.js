// This example function has default values in the function signature
export const withDefaultValues = async ({
  id,
  process = true,
  output = [],
  backup = () => ('backup'),
}) => {
  if (process) {
    output.push(backup())
  }
  return `${id}: ${output.join('\t')}`
}

// This example function has a different default value definition in the function signature
export const withDefaultValuesTwo = async (args = {
  id,
  process: true,
  output: [],
  backup: () => ('backup'),
}) => {
  if (args.process) {
    args.output.push(args.backup())
  }
  return `${args.id}: ${args.output.join('\t')}`
}
