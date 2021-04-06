import {
    Chapter,
    ChapterDetails,
    HomeSection,
    Manga, MangaTile, MangaUpdates,
    PagedResults,
    Request,
    SearchRequest,
    Source,
    SourceInfo,
} from "paperback-extensions-common"
import {RainOfSnowParser} from "./RainOfSnowParser";

const BASE = "https://rainofsnow.com"

export const RainOfSnowInfo: SourceInfo = {
    icon: "icon.png",
    version: "1.2.0",
    name: "RainOfSnow",
    author: "PythonCoderAS",
    authorWebsite: "https://github.com/PythonCoderAS",
    description: "Extension that pulls manga from RainOfSnow",
    language: "en",
    hentaiSource: false,
    websiteBaseURL: BASE
}

export class RainOfSnow extends Source {

    private readonly parser: RainOfSnowParser = new RainOfSnowParser();

    getMangaShareUrl(mangaId: string): string | null {
        return `${BASE}/comic/${mangaId}`;
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        sectionCallback(createHomeSection({
            id: "1",
            items: (await this.getWebsiteMangaDirectory(null)).results,
            title: "All Comics"
        }));
    }

    async doGetWebsiteMangaDirectory(page: number = 1){
        const options: Request = createRequestObject({
            url: `${BASE}/comics-library/page/${page}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        let tiles: MangaTile[] = this.parser.parseMangaList($, BASE);
        if ($("a.next").length !== 0){
            tiles = tiles.concat(await this.doGetWebsiteMangaDirectory(page+1))
        }
        return tiles;
    }

    async getWebsiteMangaDirectory(metadata: any): Promise<PagedResults> {
        return createPagedResults({
            results: await this.doGetWebsiteMangaDirectory()
        });
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const options: Request = createRequestObject({
            url: `${BASE}/${chapterId}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return createChapterDetails({
            id: chapterId,
            longStrip: true,
            mangaId: mangaId,
            pages: this.parser.parsePages($)
        })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const options: Request = createRequestObject({
            url: `${BASE}/${mangaId}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return this.parser.parseChapterList($, mangaId, BASE);
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const options: Request = createRequestObject({
            url: `${BASE}/comic/${mangaId}`,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return this.parser.parseManga($, mangaId, BASE);
    }

    async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
        let url = `${BASE}/?serchfor=comics`
        if (query.title){
            url += `&s=${query.title}`
        }
        const options: Request = createRequestObject({
            url: url,
            method: 'GET'
        });
        let response = await this.requestManager.schedule(options, 1);
        let $ = this.cheerio.load(response.data);
        return createPagedResults({
            results: this.parser.parseSearchResult($, BASE)
        });
    }

    async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
        mangaUpdatesFoundCallback(createMangaUpdates({
            ids: ids
        }));
    }
}