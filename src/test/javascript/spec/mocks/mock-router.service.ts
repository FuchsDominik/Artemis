export class MockRouter {
    url: string;
    setUrl = (url: string) => (this.url = url);
}