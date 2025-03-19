import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'orderBy',
    standalone: true // Important for standalone components!
})
export class OrderByPipe implements PipeTransform {
    transform(array: any[], field: string): any[] {
        if (!Array.isArray(array) || !field) return array;

        return array.sort((a, b) => {
            const nameA = a[field]?.toString().toLowerCase() || '';
            const nameB = b[field]?.toString().toLowerCase() || '';
            return nameA.localeCompare(nameB);
        });
    }
}
