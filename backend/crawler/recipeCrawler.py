import os
import re
import csv
import time
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, parse_qs


BASE_URL = "https://www.10000recipe.com"
LIST_URL = "https://www.10000recipe.com/recipe/list.html"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

RECIPE_CSV = os.path.join(DATA_DIR, "recipe.csv")
INGREDIENT_CSV = os.path.join(DATA_DIR, "ingredient.csv")
STEP_CSV = os.path.join(DATA_DIR, "step.csv")
FAILED_CSV = os.path.join(DATA_DIR, "failed.csv")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}


def safe_text(tag):
    return tag.get_text(" ", strip=True) if tag else ""


def safe_attr(tag, attr):
    return tag.get(attr, "") if tag else ""


def clean_text(text):
    return re.sub(r"\s+", " ", text).strip() if text else ""


def extract_recipe_id(url):
    match = re.search(r"/recipe/(\d+)", url)
    return match.group(1) if match else ""


def extract_heat_level(text):
    if not text:
        return ""

    if "약불" in text:
        return "약불"

    if "중불" in text:
        return "중불"

    if "강불" in text or "센불" in text or "쎈불" in text:
        return "강불"

    return ""


def extract_timer_seconds(text):
    if not text:
        return ""

    total_seconds = 0

    hour_match = re.search(r"(\d+)\s*시간", text)
    minute_match = re.search(r"(\d+)\s*분", text)
    second_match = re.search(r"(\d+)\s*초", text)

    if hour_match:
        total_seconds += int(hour_match.group(1)) * 3600

    if minute_match:
        total_seconds += int(minute_match.group(1)) * 60

    if second_match:
        total_seconds += int(second_match.group(1))

    return total_seconds if total_seconds > 0 else ""


def extract_tip(step_tag):
    for selector in [".step_tip", ".view_step_tip", ".tip", "blockquote"]:
        tip = clean_text(safe_text(step_tag.select_one(selector)))
        if tip:
            return tip

    return ""


def get_recipe_links(page=1, query=""):
    params = {"page": page}

    if query:
        params["q"] = query

    res = requests.get(
        LIST_URL,
        params=params,
        headers=HEADERS,
        timeout=10
    )
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")
    links = []

    for a in soup.select('a[href*="/recipe/"]'):
        href = a.get("href", "")
        recipe_id = extract_recipe_id(href)

        if not recipe_id:
            continue

        full_url = urljoin(BASE_URL, href)
        links.append((recipe_id, full_url))

    return list(dict.fromkeys(links))


def extract_categories_from_url(source_url):
    parsed = urlparse(source_url)
    params = parse_qs(parsed.query)

    return {
        "cat1_method": clean_text(params.get("cat1", [""])[0]),
        "cat2_situation": clean_text(params.get("cat2", [""])[0]),
        "cat3_ingredient": clean_text(params.get("cat3", [""])[0]),
        "cat4_type": clean_text(params.get("cat4", [""])[0]),
    }


def extract_categories_from_page(soup, source_url):
    categories = extract_categories_from_url(source_url)

    candidate_texts = []

    selectors = [
        ".view2_summary_info2",
        ".view2_summary_info",
        ".view2_summary_info3",
        ".view_tag",
        ".cont_tag",
    ]

    for selector in selectors:
        for tag in soup.select(selector):
            text = clean_text(safe_text(tag))
            if text:
                candidate_texts.append(text)

    joined = " ".join(candidate_texts)

    patterns = {
        "cat1_method": [r"방법\s*[:：]\s*([^\s>/|]+)", r"요리방법\s*[:：]\s*([^\s>/|]+)"],
        "cat2_situation": [r"상황\s*[:：]\s*([^\s>/|]+)"],
        "cat3_ingredient": [r"재료\s*[:：]\s*([^\s>/|]+)", r"주재료\s*[:：]\s*([^\s>/|]+)"],
        "cat4_type": [r"종류\s*[:：]\s*([^\s>/|]+)"],
    }

    for key, regex_list in patterns.items():
        if categories.get(key):
            continue

        for regex in regex_list:
            match = re.search(regex, joined)
            if match:
                categories[key] = clean_text(match.group(1))
                break

    # 링크 텍스트 기반 보조 추출
    for a in soup.select("a"):
        text = clean_text(safe_text(a))
        href = safe_attr(a, "href")

        if not text or "cat" not in href:
            continue

        if "cat1" in href and not categories["cat1_method"]:
            categories["cat1_method"] = text
        elif "cat2" in href and not categories["cat2_situation"]:
            categories["cat2_situation"] = text
        elif "cat3" in href and not categories["cat3_ingredient"]:
            categories["cat3_ingredient"] = text
        elif "cat4" in href and not categories["cat4_type"]:
            categories["cat4_type"] = text

    return categories


def crawl_recipe(recipe_id, source_url):
    res = requests.get(
        source_url,
        headers=HEADERS,
        timeout=10
    )

    if res.status_code != 200:
        raise Exception(f"HTTP {res.status_code}")

    soup = BeautifulSoup(res.text, "html.parser")

    title = clean_text(safe_text(soup.select_one(".view2_summary h3")))

    if not title:
        raise Exception("title 없음")

    description = clean_text(safe_text(soup.select_one(".view2_summary_in")))
    thumbnail_url = safe_attr(soup.select_one(".centeredcrop img"), "src")

    info = soup.select(".view2_summary_info span")
    serving_size = clean_text(safe_text(info[0])) if len(info) > 0 else ""
    cook_time = clean_text(safe_text(info[1])) if len(info) > 1 else ""
    difficulty = clean_text(safe_text(info[2])) if len(info) > 2 else ""

    if difficulty not in ["아무나", "초급", "중급", "고급", "신의경지"]:
        difficulty = ""

    categories = extract_categories_from_page(soup, source_url)

    recipe = {
        "external_recipe_id": recipe_id,
        "source_url": source_url,
        "title": title,
        "description": description,
        "thumbnail_url": thumbnail_url,
        "difficulty": difficulty,
        "serving_size": serving_size,
        "cook_time": cook_time,
        "cat1_method": categories["cat1_method"],
        "cat2_situation": categories["cat2_situation"],
        "cat3_ingredient": categories["cat3_ingredient"],
        "cat4_type": categories["cat4_type"],
    }

    ingredients = []

    for sec in soup.select(".ready_ingre3"):
        section_title = clean_text(safe_text(sec.select_one("b")))

        if "양념" in section_title:
            section = "양념"
        elif "재료" in section_title:
            section = "재료"
        else:
            section = "기타"

        for item in sec.select("li"):
            name = clean_text(
                safe_text(
                    item.select_one(".ingre_list_name")
                    or item.select_one("a")
                    or item.select_one("span")
                )
            )

            amount = clean_text(
                safe_text(
                    item.select_one(".ingre_list_ea")
                    or item.select_one("span:last-child")
                )
            )

            if not name:
                continue

            ingredients.append({
                "external_recipe_id": recipe_id,
                "section": section,
                "name": name,
                "amount": amount
            })

    steps = []

    for idx, step in enumerate(soup.select(".view_step_cont"), start=1):
        step_description = clean_text(
            safe_text(step.select_one(".media-body") or step)
        )

        if not step_description:
            continue

        image_url = safe_attr(step.select_one("img"), "src")

        steps.append({
            "external_recipe_id": recipe_id,
            "step_order": idx,
            "description": step_description,
            "image_url": image_url,
            "heat_level": extract_heat_level(step_description),
            "timer_seconds": extract_timer_seconds(step_description),
            "tip": extract_tip(step),
        })

    return recipe, ingredients, steps


def write_csv_headers():
    with open(RECIPE_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "external_recipe_id",
            "source_url",
            "title",
            "description",
            "thumbnail_url",
            "difficulty",
            "serving_size",
            "cook_time",
            "cat1_method",
            "cat2_situation",
            "cat3_ingredient",
            "cat4_type",
        ])
        writer.writeheader()

    with open(INGREDIENT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "external_recipe_id",
            "section",
            "name",
            "amount",
        ])
        writer.writeheader()

    with open(STEP_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "external_recipe_id",
            "step_order",
            "description",
            "image_url",
            "heat_level",
            "timer_seconds",
            "tip",
        ])
        writer.writeheader()

    with open(FAILED_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "external_recipe_id",
            "source_url",
            "reason",
        ])
        writer.writeheader()


def append_rows(path, fieldnames, rows):
    if not rows:
        return

    with open(path, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writerows(rows)


def run(start_page=1, end_page=3, query="", delay=1):
    write_csv_headers()

    seen = set()

    for page in range(start_page, end_page + 1):
        print(f"\n목록 페이지 수집 중: {page}")

        try:
            links = get_recipe_links(page=page, query=query)
            print(f"발견한 레시피 수: {len(links)}")
        except Exception as e:
            print(f"❌ 목록 페이지 실패: {page} / {e}")
            continue

        for recipe_id, source_url in links:
            if recipe_id in seen:
                continue

            seen.add(recipe_id)

            try:
                print(f"크롤링 중: {recipe_id}")

                recipe, ingredients, steps = crawl_recipe(recipe_id, source_url)

                append_rows(RECIPE_CSV, [
                    "external_recipe_id",
                    "source_url",
                    "title",
                    "description",
                    "thumbnail_url",
                    "difficulty",
                    "serving_size",
                    "cook_time",
                    "cat1_method",
                    "cat2_situation",
                    "cat3_ingredient",
                    "cat4_type",
                ], [recipe])

                append_rows(INGREDIENT_CSV, [
                    "external_recipe_id",
                    "section",
                    "name",
                    "amount",
                ], ingredients)

                append_rows(STEP_CSV, [
                    "external_recipe_id",
                    "step_order",
                    "description",
                    "image_url",
                    "heat_level",
                    "timer_seconds",
                    "tip",
                ], steps)

                print(f"✅ CSV 저장 완료: {recipe_id}")

            except Exception as e:
                append_rows(FAILED_CSV, [
                    "external_recipe_id",
                    "source_url",
                    "reason",
                ], [{
                    "external_recipe_id": recipe_id,
                    "source_url": source_url,
                    "reason": str(e),
                }])

                print(f"❌ 실패: {recipe_id} / {e}")

            time.sleep(delay)

    print("\n완료")
    print(f"RECIPE CSV: {RECIPE_CSV}")
    print(f"INGREDIENT CSV: {INGREDIENT_CSV}")
    print(f"STEP CSV: {STEP_CSV}")
    print(f"FAILED CSV: {FAILED_CSV}")


if __name__ == "__main__":
    run(
        start_page=1,
        end_page=20,
        query="",
        delay=1
    )