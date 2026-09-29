using System.Collections.Generic;
using Enroute.Core;
using UnityEngine;
using UnityEngine.UI;

namespace Enroute.Game
{
    /// <summary>
    /// Minimal runtime-built UI for local/hotseat play: the current player's hand as
    /// clickable cards, a draw button, a turn/phase banner, a short event log, and a
    /// target picker for attack/dépassement cards. Built entirely in code (Canvas +
    /// uGUI) so no scene/prefab authoring is required — swap for hand-authored,
    /// styled prefabs later without touching GameController.
    /// </summary>
    [ExecuteAlways]
    public class GameUI : MonoBehaviour
    {
        public GameController Controller;

        // [SerializeField] so these cached references survive an editor script recompile
        // (a domain reload wipes plain private fields even though the GameObjects they
        // point to are untouched) — otherwise Refresh() would NullReferenceException the
        // next time any script in the project changes.
        [SerializeField] private Canvas _canvas;
        [SerializeField] private Text _turnLabel;
        [SerializeField] private Text _logLabel;
        [SerializeField] private RectTransform _handRow;
        [SerializeField] private GameObject _targetPickerPanel;
        [SerializeField] private RectTransform _targetPickerRow;
        [SerializeField] private Button _drawButton;

        private string _pendingCardUid;
        private bool _pendingIsSpecial;

        private static Font UiFont => Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        private void Awake()
        {
            BuildUi();
        }

        private void OnEnable()
        {
            // Plain MonoBehaviour lifecycle methods don't run in Edit Mode without
            // [ExecuteAlways], and Awake may not have run yet for a component just added
            // by an editor script — build here too (idempotent) so the UI exists for
            // verification without entering Play Mode.
            BuildUi();
            if (Controller == null) Controller = FindFirstObjectByType<GameController>();
            if (Controller != null)
            {
                Controller.OnStateChanged += Refresh;
                if (Controller.State != null) Refresh(Controller.State);
            }
        }

        private void OnDisable()
        {
            if (Controller != null) Controller.OnStateChanged -= Refresh;
        }

        /// <summary>Wires this UI to a controller and immediately reflects its current
        /// state — use this instead of assigning `Controller` directly so the state-changed
        /// subscription actually takes (OnEnable may already have run with Controller null,
        /// e.g. when both are set up together at edit time via a setup script).</summary>
        public void Bind(GameController controller)
        {
            if (Controller != null) Controller.OnStateChanged -= Refresh;
            Controller = controller;
            Controller.OnStateChanged += Refresh;
            if (Controller.State != null) Refresh(Controller.State);
        }

        private void BuildUi()
        {
            if (_canvas != null) return; // already built (e.g. Awake ran once, fields survived a later reload)

            var canvasGo = new GameObject("GameCanvas");
            canvasGo.transform.SetParent(transform, false);
            _canvas = canvasGo.AddComponent<Canvas>();
            _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            _canvas.enabled = true;
            _canvas.sortingOrder = 100;
            var scaler = canvasGo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280, 720);
            canvasGo.AddComponent<GraphicRaycaster>();

            if (FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>() == null)
            {
                var es = new GameObject("EventSystem");
                es.AddComponent<UnityEngine.EventSystems.EventSystem>();
                // The project's Active Input Handling is set to the new Input System package,
                // under which the legacy StandaloneInputModule throws every frame (it reads
                // UnityEngine.Input directly) — use the Input System's own UI module instead.
                es.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
            }

            // ---- Top bar: turn label + draw button ----
            var topBar = CreatePanel(_canvas.transform, "TopBar", new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, -70f), new Vector2(0f, 70f), new Color(0, 0, 0, 0.35f));
            _turnLabel = CreateLabel(topBar.transform, "", 26);
            var turnRt = _turnLabel.GetComponent<RectTransform>();
            turnRt.anchorMin = new Vector2(0f, 0f); turnRt.anchorMax = new Vector2(0.7f, 1f);
            turnRt.offsetMin = new Vector2(20, 0); turnRt.offsetMax = Vector2.zero;
            _turnLabel.alignment = TextAnchor.MiddleLeft;

            _drawButton = CreateButton(topBar.transform, "Piocher", new Color(0.2f, 0.55f, 0.25f));
            var drawRt = _drawButton.GetComponent<RectTransform>();
            drawRt.anchorMin = new Vector2(0.75f, 0.15f); drawRt.anchorMax = new Vector2(0.98f, 0.85f);
            drawRt.offsetMin = Vector2.zero; drawRt.offsetMax = Vector2.zero;
            _drawButton.onClick.AddListener(() => Controller.Dispatch(GameAction.DrawCard()));

            // ---- Log panel (top-left, under the bar) ----
            var logPanel = CreatePanel(_canvas.transform, "LogPanel", new Vector2(0f, 1f), new Vector2(0.42f, 1f), new Vector2(0f, -230f), new Vector2(0f, -78f), new Color(0, 0, 0, 0.28f));
            _logLabel = CreateLabel(logPanel.transform, "", 16);
            var logRt = _logLabel.GetComponent<RectTransform>();
            logRt.anchorMin = Vector2.zero; logRt.anchorMax = Vector2.one;
            logRt.offsetMin = new Vector2(14, 8); logRt.offsetMax = new Vector2(-14, -8);
            _logLabel.alignment = TextAnchor.UpperLeft;
            _logLabel.verticalOverflow = VerticalWrapMode.Overflow;

            // ---- Hand row (bottom) ----
            var handPanel = CreatePanel(_canvas.transform, "HandPanel", Vector2.zero, new Vector2(1f, 0f), new Vector2(0f, 10f), new Vector2(0f, 190f), new Color(0, 0, 0, 0.3f));
            var handGo = new GameObject("HandRow", typeof(RectTransform));
            handGo.transform.SetParent(handPanel.transform, false);
            _handRow = handGo.GetComponent<RectTransform>();
            _handRow.anchorMin = Vector2.zero; _handRow.anchorMax = Vector2.one;
            _handRow.offsetMin = new Vector2(10, 10); _handRow.offsetMax = new Vector2(-10, -10);
            var hlg = handGo.AddComponent<HorizontalLayoutGroup>();
            hlg.childForceExpandWidth = false; hlg.childForceExpandHeight = true;
            hlg.spacing = 10; hlg.childAlignment = TextAnchor.MiddleCenter;

            // ---- Target picker overlay (hidden by default) ----
            _targetPickerPanel = CreatePanel(_canvas.transform, "TargetPicker", new Vector2(0.3f, 0.35f), new Vector2(0.7f, 0.65f), Vector2.zero, Vector2.zero, new Color(0.05f, 0.05f, 0.08f, 0.92f));
            var pickerLabel = CreateLabel(_targetPickerPanel.transform, "Choisissez une cible", 20);
            var plRt = pickerLabel.GetComponent<RectTransform>();
            plRt.anchorMin = new Vector2(0f, 0.72f); plRt.anchorMax = new Vector2(1f, 1f);
            plRt.offsetMin = Vector2.zero; plRt.offsetMax = Vector2.zero;

            var pickerRowGo = new GameObject("TargetRow", typeof(RectTransform));
            pickerRowGo.transform.SetParent(_targetPickerPanel.transform, false);
            _targetPickerRow = pickerRowGo.GetComponent<RectTransform>();
            _targetPickerRow.anchorMin = new Vector2(0f, 0.22f); _targetPickerRow.anchorMax = new Vector2(1f, 0.72f);
            _targetPickerRow.offsetMin = new Vector2(10, 0); _targetPickerRow.offsetMax = new Vector2(-10, 0);
            var prlg = pickerRowGo.AddComponent<HorizontalLayoutGroup>();
            prlg.childForceExpandWidth = true; prlg.childForceExpandHeight = true; prlg.spacing = 10;

            var cancelBtn = CreateButton(_targetPickerPanel.transform, "Annuler", new Color(0.4f, 0.15f, 0.15f));
            var cancelRt = cancelBtn.GetComponent<RectTransform>();
            cancelRt.anchorMin = new Vector2(0.35f, 0.02f); cancelRt.anchorMax = new Vector2(0.65f, 0.18f);
            cancelRt.offsetMin = Vector2.zero; cancelRt.offsetMax = Vector2.zero;
            cancelBtn.onClick.AddListener(CancelTargetPicker);

            _targetPickerPanel.SetActive(false);
        }

        private GameObject CreatePanel(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax, Color bg)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = go.GetComponent<RectTransform>();
            rt.anchorMin = anchorMin; rt.anchorMax = anchorMax;
            rt.offsetMin = offsetMin; rt.offsetMax = offsetMax;
            var img = go.AddComponent<Image>();
            img.color = bg;
            return go;
        }

        private Text CreateLabel(Transform parent, string text, int fontSize)
        {
            var go = new GameObject("Label", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var t = go.AddComponent<Text>();
            t.font = UiFont;
            t.fontSize = fontSize;
            t.color = Color.white;
            t.text = text;
            t.alignment = TextAnchor.MiddleCenter;
            return t;
        }

        private Button CreateButton(Transform parent, string text, Color bg)
        {
            var go = new GameObject("Button", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var img = go.AddComponent<Image>();
            img.color = bg;
            var btn = go.AddComponent<Button>();
            var label = CreateLabel(go.transform, text, 18);
            var lrt = label.GetComponent<RectTransform>();
            lrt.anchorMin = Vector2.zero; lrt.anchorMax = Vector2.one;
            lrt.offsetMin = Vector2.zero; lrt.offsetMax = Vector2.zero;
            return btn;
        }

        private static Color CategoryColor(CardCategory c) => c switch
        {
            CardCategory.Distance => new Color(0.16f, 0.5f, 0.22f),
            CardCategory.Attaque => new Color(0.65f, 0.14f, 0.14f),
            CardCategory.Defense => new Color(0.14f, 0.35f, 0.6f),
            CardCategory.Special => new Color(0.5f, 0.25f, 0.6f),
            _ => Color.gray,
        };

        private void Refresh(GameState state)
        {
            var player = state.Players[state.CurrentPlayerIndex];
            _turnLabel.text = $"Tour de {player.Name} — {(state.Phase == GamePhase.Draw ? "à piocher" : state.Phase == GamePhase.Action ? "à jouer" : "partie terminée")} — {player.Distance}/{state.Target} km";
            _drawButton.gameObject.SetActive(state.Phase == GamePhase.Draw && state.WinnerId == null);

            var logLines = new List<string>();
            var start = Mathf.Max(0, state.Log.Count - 6);
            for (var i = state.Log.Count - 1; i >= start; i--) logLines.Add(state.Log[i].Message);
            _logLabel.text = string.Join("\n", logLines);

            foreach (Transform child in _handRow) Destroy(child.gameObject);

            if (state.Phase != GamePhase.Action || state.WinnerId != null) return;

            foreach (var card in player.Hand)
            {
                var def = CardCatalog.GetCardDef(card.DefId);
                var playable = Rules.IsCardPlayable(player, card.DefId, state);
                var btn = CreateButton(_handRow, def.Title + "\n" + def.Subtitle, CategoryColor(def.Category));
                var rt = btn.GetComponent<RectTransform>();
                var le = btn.gameObject.AddComponent<LayoutElement>();
                le.preferredWidth = 130; le.preferredHeight = 150;
                btn.GetComponentInChildren<Text>().fontSize = 14;
                btn.interactable = playable;
                var img = btn.GetComponent<Image>();
                img.color = playable ? CategoryColor(def.Category) : new Color(0.25f, 0.25f, 0.25f, 0.6f);
                var cardUid = card.Uid;
                var category = def.Category;
                var special = def.Special;
                btn.onClick.AddListener(() => OnCardClicked(cardUid, category, special));
            }
        }

        private void OnCardClicked(string cardUid, CardCategory category, SpecialType? special)
        {
            if (category == CardCategory.Attaque || special == SpecialType.Depassement)
            {
                OpenTargetPicker(cardUid, category == CardCategory.Special);
                return;
            }

            if (category == CardCategory.Distance) Controller.Dispatch(GameAction.PlayDistance(cardUid));
            else if (category == CardCategory.Defense) Controller.Dispatch(GameAction.PlayDefense(cardUid));
            else if (category == CardCategory.Special) Controller.Dispatch(GameAction.PlaySpecial(cardUid));
        }

        private void OpenTargetPicker(string cardUid, bool isSpecial)
        {
            _pendingCardUid = cardUid;
            _pendingIsSpecial = isSpecial;
            foreach (Transform child in _targetPickerRow) Destroy(child.gameObject);

            var state = Controller.State;
            var me = state.Players[state.CurrentPlayerIndex];
            foreach (var opponent in state.Players)
            {
                if (opponent.Id == me.Id) continue;
                var btn = CreateButton(_targetPickerRow, opponent.Name + "\n" + opponent.Distance + " km", new Color(0.3f, 0.3f, 0.35f));
                var targetId = opponent.Id;
                btn.onClick.AddListener(() => ConfirmTarget(targetId));
            }
            _targetPickerPanel.SetActive(true);
        }

        private void ConfirmTarget(string targetId)
        {
            _targetPickerPanel.SetActive(false);
            if (_pendingIsSpecial) Controller.Dispatch(GameAction.PlaySpecial(_pendingCardUid, targetId));
            else Controller.Dispatch(GameAction.PlayAttack(_pendingCardUid, targetId));
        }

        private void CancelTargetPicker() => _targetPickerPanel.SetActive(false);
    }
}
