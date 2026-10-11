import * as React from "react"
import { Check, ChevronsUpDown, Search, X } from "lucide-react"
import { cn } from "cn"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Badge } from "./badge"

export interface ComboboxOption {
  value: string
  label: string
  description?: string
  group?: string
  disabled?: boolean
  meta?: any
}

export interface ComboboxGroup {
  label: string
  options: ComboboxOption[]
}

export interface ComboboxProps {
  options?: ComboboxOption[]
  groups?: ComboboxGroup[]
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: (value: any) => void
  onChange?: (value: any) => void
  multiple?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  searchable?: boolean
  searchableThreshold?: number
  clearable?: boolean
  disabled?: boolean
  className?: string
  triggerClassName?: string
  contentClassName?: string
  maxDisplayedBadges?: number
}

export function Combobox({
  options = [],
  groups,
  value,
  defaultValue,
  onValueChange,
  onChange,
  multiple = false,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  searchable,
  searchableThreshold = 10,
  clearable,
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  maxDisplayedBadges = 3,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Normalize controlled vs uncontrolled value
  const isControlled = value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = React.useState<string | string[]>(() => {
    if (defaultValue !== undefined) return defaultValue
    return multiple ? [] : ""
  })

  const currentValue = isControlled ? value : uncontrolledValue

  const emitChange = React.useCallback(
    (newValue: any) => {
      if (!isControlled) {
        setUncontrolledValue(newValue)
      }
      onValueChange?.(newValue)
      onChange?.(newValue)
    },
    [isControlled, onValueChange, onChange]
  )

  // Normalize data into organized groups
  const normalizedGroups: ComboboxGroup[] = React.useMemo(() => {
    if (groups && groups.length > 0) {
      return groups
    }

    // Check if options have 'group' property
    const hasGroups = options.some((opt) => !!opt.group)
    if (hasGroups) {
      const groupMap = new Map<string, ComboboxOption[]>()
      for (const opt of options) {
        const grp = opt.group || "General"
        if (!groupMap.has(grp)) {
          groupMap.set(grp, [])
        }
        groupMap.get(grp)!.push(opt)
      }
      return Array.from(groupMap.entries()).map(([label, opts]) => ({
        label,
        options: opts,
      }))
    }

    return [{ label: "", options }]
  }, [groups, options])

  // Count total options
  const totalOptionsCount = React.useMemo(() => {
    return normalizedGroups.reduce((acc, g) => acc + g.options.length, 0)
  }, [normalizedGroups])

  // Map for fast label lookup
  const optionMap = React.useMemo(() => {
    const map = new Map<string, ComboboxOption>()
    for (const group of normalizedGroups) {
      for (const opt of group.options) {
        map.set(opt.value, opt)
      }
    }
    return map
  }, [normalizedGroups])

  // Determine if search should be enabled (auto-hide if below threshold)
  const isSearchable = searchable ?? totalOptionsCount >= searchableThreshold

  // Filter groups and options by search query
  const filteredGroups = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return normalizedGroups

    return normalizedGroups
      .map((group) => {
        const groupMatches = group.label.toLowerCase().includes(query)
        const matchingOptions = group.options.filter(
          (opt) =>
            groupMatches ||
            opt.label.toLowerCase().includes(query) ||
            opt.description?.toLowerCase().includes(query) ||
            opt.value.toLowerCase().includes(query)
        )
        return {
          label: group.label,
          options: matchingOptions,
        }
      })
      .filter((group) => group.options.length > 0)
  }, [normalizedGroups, searchQuery])

  // Selection helpers
  const isSelected = React.useCallback(
    (val: string) => {
      if (multiple) {
        return Array.isArray(currentValue) && currentValue.includes(val)
      }
      return currentValue === val
    },
    [multiple, currentValue]
  )

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      if (multiple) {
        const currentArr = Array.isArray(currentValue) ? currentValue : []
        const exists = currentArr.includes(optionValue)
        const nextArr = exists
          ? currentArr.filter((v) => v !== optionValue)
          : [...currentArr, optionValue]
        emitChange(nextArr)
      } else {
        emitChange(optionValue)
        setOpen(false)
        setSearchQuery("")
      }
    },
    [multiple, currentValue, emitChange]
  )

  const handleClearAll = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (multiple) {
        emitChange([])
      } else {
        emitChange("")
      }
    },
    [multiple, emitChange]
  )

  const handleRemoveSingle = React.useCallback(
    (e: React.MouseEvent, val: string) => {
      e.stopPropagation()
      if (multiple && Array.isArray(currentValue)) {
        emitChange(currentValue.filter((v) => v !== val))
      }
    },
    [multiple, currentValue, emitChange]
  )

  const hasSelections = multiple
    ? Array.isArray(currentValue) && currentValue.length > 0
    : Boolean(currentValue)

  const showClearButton =
    !disabled &&
    hasSelections &&
    (clearable ?? (multiple ? true : false))

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            "flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-left",
            triggerClassName
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden pr-1">
            {multiple ? (
              Array.isArray(currentValue) && currentValue.length > 0 ? (
                <>
                  {currentValue.slice(0, maxDisplayedBadges).map((val) => {
                    const opt = optionMap.get(val)
                    const label = opt ? opt.label : val
                    return (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] font-medium gap-1 max-w-[140px] truncate"
                      >
                        <span className="truncate">{label}</span>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Eliminar ${label}`}
                          onClick={(e) => handleRemoveSingle(e, val)}
                          className="hover:text-destructive shrink-0 cursor-pointer"
                        >
                          <X className="size-2.5" />
                        </span>
                      </Badge>
                    )
                  })}
                  {currentValue.length > maxDisplayedBadges && (
                    <Badge variant="outline" className="h-5 px-1 text-[10px] font-mono">
                      +{currentValue.length - maxDisplayedBadges} más
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              )
            ) : currentValue ? (
              <span className="truncate font-medium text-foreground">
                {optionMap.get(String(currentValue))?.label ?? String(currentValue)}
              </span>
            ) : (
              <span className="text-muted-foreground truncate">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
            {showClearButton && (
              <button
                type="button"
                aria-label="Limpiar selección"
                onClick={handleClearAll}
                className="rounded-full p-0.5 hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
            <ChevronsUpDown className="size-3.5 opacity-60" />
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className={cn(
            "w-[var(--anchor-width,var(--radix-popover-trigger-width))] min-w-[220px] max-w-[420px] p-0 shadow-lg border border-border bg-popover",
            contentClassName
          )}
        >
          {isSearchable && (
            <div className="flex items-center border-b border-border/80 px-2.5 py-2">
              <Search className="size-3.5 mr-2 shrink-0 opacity-50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground/70"
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 hover:text-foreground text-muted-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-1 text-xs">
            {filteredGroups.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filteredGroups.map((group, gIdx) => (
                <div key={group.label || gIdx} className="mb-1 last:mb-0">
                  {group.label && (
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 rounded-xs select-none">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-0.5 mt-0.5">
                    {group.options.map((opt) => {
                      const selected = isSelected(opt.value)
                      return (
                        <div
                          key={opt.value}
                          onClick={() => !opt.disabled && handleSelect(opt.value)}
                          className={cn(
                            "flex items-center justify-between rounded-sm px-2 py-1.5 cursor-pointer select-none transition-colors",
                            opt.disabled && "opacity-50 cursor-not-allowed",
                            selected
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted hover:text-foreground text-foreground/90",
                            group.label && "pl-3"
                          )}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="truncate">{opt.label}</span>
                            {opt.description && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {opt.description}
                              </span>
                            )}
                          </div>
                          {selected && (
                            <Check className="size-3.5 shrink-0 text-primary" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
