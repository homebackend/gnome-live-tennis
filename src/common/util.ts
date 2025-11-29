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

/**
 * Represents a node in the Doubly Linked List.
 */
class Node<K, V> {
    public next: Node<K, V> | null = null;
    public prev: Node<K, V> | null = null;
    constructor(public key: K, public value: V) {}
}

/**
 * An LRU Cache implementation using a Map and a Doubly Linked List.
 */
export class LRUCache<K, V> {
    private capacity: number;
    private map: Map<K, Node<K, V>> = new Map();
    private head: Node<K, V> | null = null; // Most recently used
    private tail: Node<K, V> | null = null; // Least recently used

    constructor(capacity: number) {
        this.capacity = capacity;
    }

    /**
     * Get an item from the cache. Moves the item to the front (most recently used).
     */
    public get(key: K): V | undefined {
        if (this.map.has(key)) {
            const node = this.map.get(key)!;
            this.moveToHead(node);
            return node.value;
        }
        return undefined;
    }

    /**
     * Add or update an item in the cache. Adds to the front. Evicts LRU if capacity is reached.
     */
    public put(key: K, value: V): void {
        if (this.map.has(key)) {
            // Update value and move to head
            const node = this.map.get(key)!;
            node.value = value;
            this.moveToHead(node);
        } else {
            // New node, add to head
            const newNode = new Node(key, value);
            this.map.set(key, newNode);
            this.addToHead(newNode);

            // Check capacity
            if (this.map.size > this.capacity) {
                this.removeLRU();
            }
        }
    }

    /**
     * Helper to move a node to the front of the list.
     */
    private moveToHead(node: Node<K, V>): void {
        this.removeFromList(node);
        this.addToHead(node);
    }

    /**
     * Helper to add a node to the front of the list.
     */
    private addToHead(node: Node<K, V>): void {
        node.prev = null;
        node.next = this.head;

        if (this.head !== null) {
            this.head.prev = node;
        }
        this.head = node;

        if (this.tail === null) {
            this.tail = node;
        }
    }

    /**
     * Helper to remove a node from the linked list.
     */
    private removeFromList(node: Node<K, V>): void {
        if (node.prev !== null) {
            node.prev.next = node.next;
        } else {
            this.head = node.next;
        }

        if (node.next !== null) {
            node.next.prev = node.prev;
        } else {
            this.tail = node.prev;
        }
    }

    /**
     * Helper to remove the least recently used item (the tail).
     */
    private removeLRU(): void {
        if (this.tail !== null) {
            const lruNode = this.tail;
            this.removeFromList(lruNode);
            this.map.delete(lruNode.key);
        }
    }
}

export function generateUUIDv4(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
