export const useObservable = <T extends Fields>(fields: T): ObservableService<T> => {
    const observers = new Map<FieldName<T>, Set<Observer>>();

    const notify = (fieldName: FieldName<T>, tag?: string) => {
        const eventName = tag ? `${fieldName}:${tag}` : fieldName;
        const getter = fields[fieldName];
        observers.get(eventName)?.forEach(observer => observer(getter()));
    };
    
    const service = {
        on: <F extends FieldName<T>>(fieldName: F, observer: (v: FieldValue<T, F>) => void) => {
            const fieldObservers = observers.get(fieldName) ?? new Set();
            fieldObservers.add(observer as Observer);
            observers.set(fieldName, fieldObservers);
            return [fieldName, observer as Observer] as ObservableId;
        },
        off: (id: ObservableId) => {
            const [fieldName, observer] = id;
            observers.get(fieldName)?.delete(observer);
        },
        notify,
    };
    
    return Object.assign(notify, service);
};

type Getter<T = unknown> = () => T;
type Observer<T = unknown> = (v: T) => void;
type Fields = Record<string, Getter>;
type ObservableId = [fieldName: string, observer: Observer];
type FieldName<T extends Fields> = keyof T & string;
type FieldValue<T extends Fields, F extends FieldName<T>> = ReturnType<T[F]>;
type Notify<T extends Fields> = (fieldName: FieldName<T>, tag?: string) => void;
type On<T extends Fields> = <F extends FieldName<T>>(fieldName: F, observer: (v: FieldValue<T, F>) => void) => ObservableId;
type Off = (id: ObservableId) => void;

type ObservableService<T extends Fields> = Notify<T> & {
    notify: Notify<T>;
    on: On<T>;
    off: Off;
}