export const FILE_EXPLORER_ROW_HEIGHT = 28;
export const FILE_EXPLORER_BASE_PADDING = 10;
export const FILE_EXPLORER_NESTING_OFFSET = 14;
export const FILE_EXPLORER_CHEVRON_SPACE = 18;

export function getItemPadding(level: number, isFile: boolean) {
  return (
    FILE_EXPLORER_BASE_PADDING +
    level * FILE_EXPLORER_NESTING_OFFSET +
    (isFile ? FILE_EXPLORER_CHEVRON_SPACE : 0)
  );
}
