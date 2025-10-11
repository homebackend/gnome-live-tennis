export class SortedStringList {
    private data: string[] = [];

    /**
     * Inserts a string into the sorted list and returns its new index.
     * @param item The string to insert.
     * @returns The index where the string was inserted.
     */
    public insert(item: string): number {
        const index = this.findInsertionIndex(item);
        this.data.splice(index, 0, item);
        return index;
    }

    /**
     * Removes the first occurrence of a string from the list.
     * @param item The string to remove.
     * @returns A boolean indicating whether the item was found and removed.
     */
    public remove(item: string): boolean {
        const index = this.findIndex(item);
        if (index !== -1) {
            this.data.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Performs a binary search to find the correct insertion index.
     * @param item The string to find the position for.
     * @returns The index where the item should be inserted to maintain order.
     */
    private findInsertionIndex(item: string): number {
        let low = 0;
        let high = this.data.length;
        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (item > this.data[mid]) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low;
    }

    /**
     * Retrieves the element at a specific index.
     * @param index The index to retrieve.
     * @returns The element at the specified index, or undefined if the index is out of bounds.
     */
    public get(index: number): string | undefined {
        return this.data[index];
    }

    /**
     * Finds the index of a string in the list using binary search.
     * @param item The string to find.
     * @returns The index of the item, or -1 if not found.
     */
    public findIndex(item: string): number {
        let low = 0;
        let high = this.data.length - 1;
        let index = -1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.data[mid] === item) {
                index = mid;
                break;
            } else if (this.data[mid] < item) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return index;
    }

    /**
     * Returns a copy of the sorted list.
     */
    public toArray(): string[] {
        return [...this.data];
    }
}
