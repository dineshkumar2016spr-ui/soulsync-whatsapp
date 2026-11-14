import json
import itertools
import random
import os

# Curated high-converting lines (50 starter expansion)
curated = [
 {"category":"reply","trigger_context":"story_traditional_wear","vibe":"romantic","tenglish":"Ee saree/kurta lo chustunte traditional day ki brand ambassador la unnav.","english_meaning":"In that saree/kurta you look like the brand ambassador of tradition.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_selfie","vibe":"smooth","tenglish":"Phone screen kuda blush avtundi ee photo chusi.","english_meaning":"Even the phone screen blushes seeing this photo.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_smile","vibe":"smooth","tenglish":"Aa smile ki copyright teesko, lekapothe chaala mandi flat aipotaru.","english_meaning":"Take a copyright on that smile, or many will fall for it.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_travel","vibe":"poetic","tenglish":"Sunset baagundi kani, frame lo nuvvu undadam valla inka baagundi.","english_meaning":"The sunset is nice, but you in the frame makes it nicer.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_food","vibe":"playful","tenglish":"Food chala tasty ga undi... kani company nenu unte inka baagundedi.","english_meaning":"The food looks tasty... but it'd be better with me there.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_mirror","vibe":"smooth","tenglish":"Mirror kuda lucky feel avtundi roju ninnu chustunnanduku.","english_meaning":"Even the mirror feels lucky to see you every day.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_eyes","vibe":"bold","tenglish":"Aa kallatho chusthe evaraina surrender aipovalsinde.","english_meaning":"Looking into those eyes, anyone would surrender.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_outfit","vibe":"smooth","tenglish":"Black color neekosame invent chesinattu undi.","english_meaning":"Black looks like it was invented just for you.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_gym","vibe":"witty","tenglish":"Already itla unnav, inka workout chesthe maa paristhithi enti?","english_meaning":"You already look like this; if you work out more, what happens to us?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"story_candid","vibe":"soft","tenglish":"Poses kanna nee candid shots lo ne magic ekkuva untundi.","english_meaning":"There's more magic in your candid shots than in posed ones.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"tinava","vibe":"soft","tenglish":"Nuvvu adigav kada, ipudu aakali kuda marchipoya.","english_meaning":"You asked, so now I even forgot my hunger.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"tinava","vibe":"romantic","tenglish":"Tinna, kani dessert laaga nee message kosam wait chestunna.","english_meaning":"I ate, but I'm waiting for your message like dessert.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"tinava","vibe":"playful","tenglish":"Inka ledu, nuvvu tinipistava?","english_meaning":"Not yet; will you feed me?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"tinava","vibe":"soft","tenglish":"Nuvvu tintene naaku kadupu nindinatlu untundi.","english_meaning":"When you eat, I feel full too.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"tinava","vibe":"romantic","tenglish":"Tinesa, kani nee voice vinte kani full satisfaction raadu.","english_meaning":"I ate, but hearing your voice gives full satisfaction.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"late_reply","vibe":"witty","tenglish":"It's okay, pedda celebrities busy ga ne untaru le.","english_meaning":"It's okay, big celebrities are busy anyway.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"late_reply","vibe":"soft","tenglish":"Parledu, nee message kosam entha sepu aina wait cheyochu.","english_meaning":"No problem, I can wait as long as for your message.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"late_reply","vibe":"playful","tenglish":"Late ga vachav kani, mood motham set chesav.","english_meaning":"You came late but set my whole mood.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"late_reply","vibe":"witty","tenglish":"Fine vesesta next time late chesthe - oka coffee treat ivvali.","english_meaning":"I'll fine you next time you're late - a coffee treat.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"late_reply","vibe":"romantic","tenglish":"Nuvvu reply ivvadaniki late chesina, naa heart beat fast avvadaniki second kuda pattadu.","english_meaning":"You were late to reply, but my heart took a second to race.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Nuvvu doctor aa? Endukante ninnu chudagane naa BP perigipotundi.","english_meaning":"Are you a doctor? Because my BP rises seeing you.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Google Maps lo kuda nee heart ki route dorakatledu, koncham location share chestava?","english_meaning":"Even Google Maps can't find the route to your heart; share location?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Nuvvu Wi-Fi hotspot on chesava? Endukante automatic ga neeku attract aipotunna.","english_meaning":"Did you turn on Wi-Fi hotspot? Because I'm auto-attracted to you.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Naku swimming raadu, kani nee kallalo munigipovalani undi.","english_meaning":"I can't swim, but I want to drown in your eyes.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Police ki complaint ivvali ninnu... endukante naa nidra dongaatanam chesav.","english_meaning":"I should complain to police... you stole my sleep.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Nuvvu magnet aa? Nenu iron aa? Enduku ila lagutunnav?","english_meaning":"Are you a magnet and I iron? Why am I stuck to you?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Neeku Google pay chesta, koncham naa dream lo ki vastava?","english_meaning":"I'll Google Pay you; come into my dreams a bit?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Charging ledu phone lo, kani neetho matladutunte naaku full energy vastundi.","english_meaning":"Phone has no charge, but talking to you gives full energy.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Nuvvu magician aa? Ninnu chudagane naa problems anni disappear aipotunnai.","english_meaning":"Are you a magician? My problems disappear seeing you.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"witty_teasing","vibe":"witty","tenglish":"Exam lo kuda inni doubts raledu, kani nee gurinchi roju thoughts vastunnai.","english_meaning":"Even in exams I had no doubts, but thoughts of you come daily.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Roju lo best part enti ante, neetho matlade aa koncham time.","english_meaning":"The best part of the day is that little time talking to you.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Nuvvu navvithe chalu, aa roju motham worth anipistundi.","english_meaning":"Your smile alone makes the whole day worth it.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Chaala mandi parichayam ayyaru, kani neela evaru anipinchaledu.","english_meaning":"I've met many, but no one feels like you.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Nuvvu pakkana unte silence kuda music la vinipistundi.","english_meaning":"With you beside me, silence sounds like music.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Naa playlist lo favourite song kanna nee voice eh ekkuva istam.","english_meaning":"I like your voice more than my favourite song.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Ninnu kalisaka ardam ayyindi, perfection ante ento.","english_meaning":"After meeting you I understood what perfection is.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Enni messages vachina, nee notification kosame wait chestunta.","english_meaning":"No matter how many messages, I wait for your notification.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Nuvvu naa life lo ki vachaka, normal days kuda special ga maripoyai.","english_meaning":"After you entered my life, even normal days became special.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Ninnu chustunte time agipothe baagundu anipistundi.","english_meaning":"I wish time would stop when I look at you.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"soft_romantic","vibe":"soft","tenglish":"Simple ga cheppalante, naa happiness ki shortcut nuvve.","english_meaning":"Simply put, you're the shortcut to my happiness.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"bold","tenglish":"Chatting lo ne inta vibe unte, direct ga kalisthe ela untundo?","english_meaning":"If the chat vibe is this good, how would meeting be?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"playful","tenglish":"Ee weekend free na? Oka manchi coffee spot telusu, veldama?","english_meaning":"Free this weekend? I know a good coffee spot; shall we go?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"playful","tenglish":"Typing chesi chesi fingers noppi pudutunnai, call cheymantava?","english_meaning":"My fingers hurt from typing; will you call?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"playful","tenglish":"Long drive ki veldama? Music nenu pedatha, company nuvvu ivvu.","english_meaning":"Shall we go on a long drive? I'll bring music, you bring company.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"bold","tenglish":"Ninnu direct ga chudakunda ee week gadichela ledu, eppudu kaludham?","english_meaning":"I couldn't get through this week without seeing you; when shall we meet?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"playful","tenglish":"Ice cream treat naadi, time needi. Deal aa?","english_meaning":"Ice cream treat is mine, time is yours. Deal?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"soft","tenglish":"Oka 10 minutes kaludham ani start chesthe, 2 hours ela gadichipothayo teliyadu neetho.","english_meaning":"If we meet for 10 minutes, 2 hours pass with you, I don't know how.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"bold","tenglish":"Mana conversation ki next level ki teesukeldama? Dinner?","english_meaning":"Shall we take our conversation to the next level? Dinner?","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"playful","tenglish":"Neeku bore kodithe cheppu, 15 minutes lo nee inti mundu unta.","english_meaning":"If you're bored, tell me; I'll be at your door in 15 minutes.","target_gender":"neutral"},
 {"category":"reply","trigger_context":"asking_out","vibe":"playful","tenglish":"Phone screen meeda chusi chusi bore kottindi, real ga eppudu kanipistav?","english_meaning":"I'm bored of seeing you on screen; when will you appear in real?","target_gender":"neutral"},
]

# Combinatorial generator
openers = ["Nijam cheppalante,", "Okati cheppana,", "Seriously,", "Honest ga cheptunna,", "Naku oka doubt,", "By the way,", "Listen,", "Oka chinna vishayam,"]
subjects = ["nee smile chusthe", "nuvvu pakkana unte", "nee voice vinte", "nee kallalo chusthe", "nuvvu message chesthe", "ninnu chusinappudu", "nee navvu chusthe", "nuvvu matladutunte"]
reactions = ["time assalu teliyadu.", "day motham bright aipotundi.", "naa heart beat fast aipotundi.", "automatic ga face lo smile vachestundi.", "tension motham mayam aipotundi.", "world lo vere em gurthuku raadu.", "nenu flat aipotunna.", "magic jariginattu anipistundi."]
closers = ["Idi normal aa leka love aa?", "Deeniki solution enti mari?", "Koncham care teesko naa gurinchi.", "Nuvve cheppu em cheyalo.", "Malli malli chudalanipistundi.", ""]

random.seed(42)
combos = list(itertools.product(openers, subjects, reactions, closers))
random.shuffle(combos)

generated = []
for idx, (op, sub, react, close) in enumerate(combos[:500], start=1):
    line = ("{} {} {} {}".format(op, sub, react, close)).strip()
    generated.append({"id": len(curated) + idx, "category": "flirt_line", "trigger_context": "combinatorial", "vibe": "smooth", "tenglish": line, "english_meaning": "", "target_gender": "neutral"})

dataset = []
for i, e in enumerate(curated, start=1):
    e = dict(e); e["id"] = i
    dataset.append(e)
for e in generated:
    dataset.append(e)

out_path = os.path.join(os.path.dirname(__file__), "tenglish_flirt_kb.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(dataset, f, indent=2, ensure_ascii=False)

print("Generated {} entries ({} curated + {} combinatorial) -> {}".format(len(dataset), len(curated), len(generated), out_path))
