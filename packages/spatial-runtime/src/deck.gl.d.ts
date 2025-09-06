// Temporary type declarations for deck.gl
declare module '@deck.gl/core' {
  export class Deck {
    constructor(props: any);
    setProps(props: any): void;
    finalize(): void;
  }
}