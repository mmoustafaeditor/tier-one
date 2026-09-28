package com.sembagames.thegaffer;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import java.net.URL;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class UpdateChecker {
    private static final String PREFS_NAME = "GafferUpdateChecker";
    private static final String PREF_LAST_CHECK = "last_check";
    private static final String UPDATE_URL = "https://sembagames.app/api/the-gaffer/latest";
    private static final long CHECK_INTERVAL = 6 * 60 * 60 * 1000;
    private final Context context;
    private final Activity activity;

    public UpdateChecker(Context context, Activity activity) {
        this.context = context;
        this.activity = activity;
    }

    public void checkForUpdates() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long lastCheck = prefs.getLong(PREF_LAST_CHECK, 0);
        long now = System.currentTimeMillis();
        if (now - lastCheck < CHECK_INTERVAL) return;
        prefs.edit().putLong(PREF_LAST_CHECK, now).apply();

        Executor executor = Executors.newSingleThreadExecutor();
        executor.execute(() -> {
            try {
                String response = fetchUpdate();
                if (response == null) return;
                JSONObject json = new JSONObject(response);
                String latestVersion = json.optString("version");
                String downloadUrl = json.optString("downloadUrl");
                String changelog = json.optString("changelog", "");
                int currentVersionCode = BuildConfig.VERSION_CODE;
                int latestVersionCode = json.optInt("versionCode", currentVersionCode);
                if (latestVersionCode > currentVersionCode && !downloadUrl.isEmpty()) {
                    new Handler(Looper.getMainLooper()).post(() ->
                        showUpdateDialog(latestVersion, downloadUrl, changelog)
                    );
                }
            } catch (Exception ignored) {
                // Update checks must never block offline play.
            }
        });
    }

    private String fetchUpdate() throws Exception {
        URL url = new URL(UPDATE_URL);
        java.net.URLConnection conn = url.openConnection();
        conn.setConnectTimeout(5000);
        conn.setReadTimeout(5000);
        java.io.BufferedReader reader = new java.io.BufferedReader(
            new java.io.InputStreamReader(conn.getInputStream())
        );
        StringBuilder result = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) result.append(line);
        reader.close();
        return result.toString();
    }

    private void showUpdateDialog(String version, String downloadUrl, String changelog) {
        new AlertDialog.Builder(activity)
            .setTitle("The Gaffer update available")
            .setMessage("Version " + version + " is available.\n\n" + changelog)
            .setPositiveButton("Download", (dialog, which) -> {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl));
                context.startActivity(intent);
            })
            .setNegativeButton("Later", (dialog, which) -> dialog.dismiss())
            .setCancelable(false)
            .show();
    }
}
