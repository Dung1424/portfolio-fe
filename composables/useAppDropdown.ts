export function toggleAppDropdown(dropdownId: string) {
  const el = document.getElementById(dropdownId)
  el?.classList.toggle('show')
}
