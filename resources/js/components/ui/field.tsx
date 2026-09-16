import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function FieldGroup({
    className,
    ...props
}: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="field-group"
            className={cn('group/field-group flex w-full flex-col gap-5', className)}
            {...props}
        />
    );
}

function Field({
    className,
    orientation = 'vertical',
    ...props
}: React.ComponentProps<'div'> & {
    orientation?: 'vertical' | 'horizontal';
}) {
    return (
        <div
            data-slot="field"
            data-orientation={orientation}
            className={cn(
                'group/field flex min-w-0 flex-col gap-2',
                orientation === 'horizontal' && 'flex-row items-start gap-3',
                className,
            )}
            {...props}
        />
    );
}

function FieldLabel({
    className,
    ...props
}: React.ComponentProps<typeof Label>) {
    return (
        <Label
            data-slot="field-label"
            className={cn('w-fit group-data-[invalid=true]/field:text-destructive', className)}
            {...props}
        />
    );
}

function FieldLegend({
    className,
    ...props
}: React.ComponentProps<'legend'>) {
    return (
        <legend
            data-slot="field-legend"
            className={cn('mb-1 text-sm font-medium', className)}
            {...props}
        />
    );
}

function FieldSet({
    className,
    ...props
}: React.ComponentProps<'fieldset'>) {
    return (
        <fieldset
            data-slot="field-set"
            className={cn('flex min-w-0 flex-col gap-3', className)}
            {...props}
        />
    );
}

function FieldDescription({
    className,
    ...props
}: React.ComponentProps<'p'>) {
    return (
        <p
            data-slot="field-description"
            className={cn('text-xs leading-5 text-muted-foreground', className)}
            {...props}
        />
    );
}

function RequiredMark() {
    return (
        <span className="ml-1 text-destructive" aria-hidden="true">
            *
        </span>
    );
}

export {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    RequiredMark,
};
