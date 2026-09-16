import { Check, ChevronsUpDown } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ComboboxOption = {
    value: string;
    label: string;
};

type ComboboxProps = {
    id: string;
    value: string;
    options: ComboboxOption[];
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
    invalid?: boolean;
    onValueChange: (value: string) => void;
};

export function Combobox({
    id,
    value,
    options,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    invalid = false,
    onValueChange,
}: ComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();

    const selectedOption = options.find((option) => option.value === value);
    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (normalizedQuery === '') {
            return options;
        }

        return options.filter((option) =>
            option.label.toLowerCase().includes(normalizedQuery),
        );
    }, [options, query]);

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        setQuery('');
        setActiveIndex(
            Math.max(
                0,
                options.findIndex((option) => option.value === value),
            ),
        );
    };

    const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown' && filteredOptions.length > 0) {
            event.preventDefault();
            setActiveIndex((index) =>
                Math.min(index + 1, filteredOptions.length - 1),
            );
        }

        if (event.key === 'ArrowUp' && filteredOptions.length > 0) {
            event.preventDefault();
            setActiveIndex((index) => Math.max(index - 1, 0));
        }

        if (event.key === 'Enter' && filteredOptions[activeIndex]) {
            event.preventDefault();
            onValueChange(filteredOptions[activeIndex].value);
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listboxId}
                    aria-invalid={invalid}
                    className="h-10 w-full justify-between rounded-lg px-3 font-normal"
                >
                    <span
                        className={cn(
                            'truncate text-left',
                            !selectedOption && 'text-muted-foreground',
                        )}
                    >
                        {selectedOption?.label ?? placeholder}
                    </span>
                    <ChevronsUpDown
                        data-icon="inline-end"
                        className="opacity-50"
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                    searchInputRef.current?.focus();
                }}
                className="w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden p-0"
            >
                <div className="border-b p-2">
                    <Input
                        ref={searchInputRef}
                        role="combobox"
                        aria-label={searchPlaceholder}
                        aria-autocomplete="list"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-activedescendant={
                            filteredOptions[activeIndex]
                                ? `${listboxId}-${filteredOptions[activeIndex].value}`
                                : undefined
                        }
                        autoComplete="off"
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value);
                            setActiveIndex(0);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        className="h-9 border-0 shadow-none focus-visible:ring-0"
                    />
                </div>
                {filteredOptions.length > 0 ? (
                    <div
                        id={listboxId}
                        role="listbox"
                        aria-label={placeholder}
                        onWheel={(event) => event.stopPropagation()}
                        className="max-h-72 overscroll-contain overflow-y-auto p-1"
                    >
                        {filteredOptions.map((option, index) => (
                            <Button
                                key={option.value}
                                id={`${listboxId}-${option.value}`}
                                type="button"
                                variant="ghost"
                                role="option"
                                aria-selected={option.value === value}
                                data-active={index === activeIndex}
                                onPointerMove={() => setActiveIndex(index)}
                                onClick={() => {
                                    onValueChange(option.value);
                                    setOpen(false);
                                }}
                                className="h-auto min-h-9 w-full justify-start gap-2 rounded-md px-2 py-2 text-left font-normal whitespace-normal data-[active=true]:bg-accent"
                            >
                                <Check
                                    data-icon="inline-start"
                                    className={cn(
                                        'shrink-0',
                                        option.value === value
                                            ? 'text-primary opacity-100'
                                            : 'opacity-0',
                                    )}
                                />
                                <span className="min-w-0 break-words">
                                    {option.label}
                                </span>
                            </Button>
                        ))}
                    </div>
                ) : (
                    <p
                        role="status"
                        className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                        {emptyMessage}
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}
