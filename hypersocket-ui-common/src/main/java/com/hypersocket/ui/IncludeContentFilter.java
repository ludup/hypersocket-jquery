package com.hypersocket.ui;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.Charset;
import java.util.ArrayList;
import java.util.List;

import javax.servlet.http.HttpServletRequest;

import org.apache.commons.io.IOUtils;
import org.springframework.stereotype.Component;

import com.hypersocket.server.handlers.impl.ContentFilter;
import com.hypersocket.utils.ITokenResolver;
import com.hypersocket.utils.TokenReplacementReader;

@Component
public class IncludeContentFilter implements ContentFilter {

	private List<ITokenResolver> additionalResolvers = new ArrayList<ITokenResolver>();
	private String headerHtml;
	private String footerHtml;

	public IncludeContentFilter() throws IOException {

		InputStream in = getClass().getResourceAsStream("/webapp/header.html");
		try {
			headerHtml = IOUtils.toString(in, "UTF-8");
		} finally {
			IOUtils.closeQuietly(in);
		}

		in = getClass().getResourceAsStream("/webapp/footer.html");
		try {
			footerHtml = IOUtils.toString(in, "UTF-8");
		} finally {
			IOUtils.closeQuietly(in);
		}
	}
	

	@Override
	public InputStream getFilterStream(InputStream resourceStream, HttpServletRequest request) {

		MapTokenResolver resolver = new MapTokenResolver();
		resolver.addToken("header", headerHtml);
		resolver.addToken("footer", footerHtml);

		List<ITokenResolver> resolvers = new ArrayList<ITokenResolver>(additionalResolvers);
		resolvers.add(resolver);

		TokenReplacementReader r = new TokenReplacementReader(new BufferedReader(new InputStreamReader(resourceStream)),
				resolvers);
		return new ReaderInputStream(r, Charset.forName("UTF-8"));
	}

	@Override
	public boolean filtersPath(String path) {
		return path.endsWith(".html") || path.endsWith(".htm");
	}

	public void addResolver(ITokenResolver resolver) {
		additionalResolvers.add(resolver);
	}

	public void setHeader(String headerHtml) {
		this.headerHtml = headerHtml;
	}

	public void setFooter(String footerHtml) {
		this.footerHtml = footerHtml;
	}

	@Override
	public Integer getWeight() {
		return -10000;
	}

}
